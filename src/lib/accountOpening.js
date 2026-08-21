import { createLedgerEntry, recomputeAndPersistAccountLedgerBalances, startOfLedgerDay } from "./ledger";
import { parseBalanceAmount, formAmountToLedgerBalance } from "./accountBalanceForm";

/** Parse opening balance from form/API input. */
export function parseOpeningBalance(val) {
  return parseBalanceAmount(val);
}

/**
 * Post opening balance ledger entry for a new account.
 * Asset: positive = debit (cash, receivable). Liability: positive = credit (payable).
 * Uses start-of-day date so the entry sorts in chronological ledger order.
 */
export async function applyOpeningBalance(
  tx,
  accountId,
  accountType,
  openingBalanceRaw,
  openingDateRaw
) {
  const amount = parseOpeningBalance(openingBalanceRaw);
  if (amount === 0) return;

  let dateSource = openingDateRaw;
  if (!dateSource) {
    const account = await tx.account.findUnique({
      where: { id: accountId },
      select: { createdAt: true },
    });
    dateSource = account?.createdAt;
  }
  const date = startOfLedgerDay(dateSource);

  const isLiability = accountType === "liability";
  const debit = isLiability ? (amount < 0 ? Math.abs(amount) : 0) : amount > 0 ? amount : 0;
  const credit = isLiability ? (amount > 0 ? amount : 0) : amount < 0 ? Math.abs(amount) : 0;
  const signedOpening = debit - credit;

  await tx.account.update({
    where: { id: accountId },
    data: { openingBalance: signedOpening },
  });

  await tx.ledgerEntry.create({
    data: {
      accountId,
      date,
      description: "Opening balance",
      referenceType: "OpeningBalance",
      debit,
      credit,
      balance: 0,
    },
  });

  await recomputeAndPersistAccountLedgerBalances(tx, accountId);
}

/** Update the opening balance ledger line date (re-flows in statement order). */
export async function updateOpeningBalanceDate(tx, accountId, openingDateRaw) {
  if (!openingDateRaw) return;

  const opening = await tx.ledgerEntry.findFirst({
    where: {
      accountId,
      OR: [{ referenceType: "OpeningBalance" }, { description: "Opening balance" }],
    },
    orderBy: [{ id: "asc" }],
  });
  if (!opening) return;

  const date = startOfLedgerDay(openingDateRaw);
  await tx.ledgerEntry.update({
    where: { id: opening.id },
    data: { date },
  });

  await recomputeAndPersistAccountLedgerBalances(tx, accountId);
}

/**
 * Set account to a new balance from the edit form (posts a balance adjustment entry).
 */
export async function syncAccountBalanceFromForm(tx, accountId, currentBalanceRaw) {
  if (currentBalanceRaw === undefined || currentBalanceRaw === null || currentBalanceRaw === "") return;

  const account = await tx.account.findUnique({ where: { id: accountId } });
  if (!account) return;

  const target = formAmountToLedgerBalance(account.type, currentBalanceRaw);
  const current = account.balance || 0;
  const delta = target - current;
  if (Math.abs(delta) < 0.005) return;

  if (delta > 0) {
    await createLedgerEntry(tx, {
      accountId,
      date: new Date(),
      description: "Balance adjustment",
      referenceType: "BalanceAdjustment",
      debit: delta,
      credit: 0,
    });
  } else {
    await createLedgerEntry(tx, {
      accountId,
      date: new Date(),
      description: "Balance adjustment",
      referenceType: "BalanceAdjustment",
      debit: 0,
      credit: Math.abs(delta),
    });
  }
}

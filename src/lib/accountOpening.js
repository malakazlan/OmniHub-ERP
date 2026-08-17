import { createLedgerEntry } from "./ledger";
import { parseBalanceAmount, formAmountToLedgerBalance } from "./accountBalanceForm";

/** Parse opening balance from form/API input. */
export function parseOpeningBalance(val) {
  return parseBalanceAmount(val);
}

/**
 * Post opening balance ledger entry for a new account.
 * Asset: positive = debit (cash, receivable). Liability: positive = credit (payable).
 */
export async function applyOpeningBalance(tx, accountId, accountType, openingBalanceRaw) {
  const amount = parseOpeningBalance(openingBalanceRaw);
  if (amount === 0) return;

  const isLiability = accountType === "liability";
  const debit = isLiability ? (amount < 0 ? Math.abs(amount) : 0) : amount > 0 ? amount : 0;
  const credit = isLiability ? (amount > 0 ? amount : 0) : amount < 0 ? Math.abs(amount) : 0;
  const balance = debit - credit;

  await tx.account.update({
    where: { id: accountId },
    data: { openingBalance: balance, balance },
  });

  await tx.ledgerEntry.create({
    data: {
      accountId,
      date: new Date(),
      description: "Opening balance",
      debit,
      credit,
      balance,
    },
  });
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

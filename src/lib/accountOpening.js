/** Parse opening balance from form/API input. */
export function parseOpeningBalance(val) {
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : 0;
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

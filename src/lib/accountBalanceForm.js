/** Parse balance amount from form/API input. */
export function parseBalanceAmount(val) {
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : 0;
}

/** Show balance in forms the same way users enter opening balance (payable as positive). */
export function balanceToFormAmount(accountType, ledgerBalance) {
  const b = Number(ledgerBalance) || 0;
  if (accountType === "liability") return -b;
  return b;
}

/** Convert a form balance back to stored ledger balance. */
export function formAmountToLedgerBalance(accountType, formAmount) {
  const amount = parseBalanceAmount(formAmount);
  if (accountType === "liability") return -amount;
  return amount;
}

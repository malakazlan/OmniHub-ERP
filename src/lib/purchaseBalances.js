/** Vendor ledger balance before/after this purchase (for bills & forms). */
export function computeVendorBalancesForPurchase(purchase, vendorAccountBalance = 0) {
  const total = Number(purchase.totalAmount) || 0;
  const paid = Number(purchase.paidAmount) || 0;
  const confirmed =
    purchase.status === "confirmed" || purchase.status === "received";

  const currentLedger = Number(vendorAccountBalance) || 0;

  if (confirmed) {
    const previousBalance = currentLedger + total - paid;
    return { previousBalance, currentBalance: currentLedger };
  }

  const previousBalance = currentLedger;
  const currentBalance = currentLedger + total - paid;
  return { previousBalance, currentBalance };
}

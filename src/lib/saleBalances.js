import { resolveSalePayment } from "./salePayment";

function saleEffectsApplied(status) {
  return status === "confirmed" || status === "dispatched" || status === "delivered";
}

/** Customer ledger balance before/after this sale (receivable accounts). */
export function computeCustomerBalancesForSale(sale, customerAccountBalance = 0) {
  const payment = resolveSalePayment(sale);
  const balanceDue = payment.balanceDue;
  const currentLedger = Number(customerAccountBalance) || 0;
  const confirmed = saleEffectsApplied(sale?.status);

  if (confirmed) {
    const previousBalance = currentLedger - balanceDue;
    return {
      previousBalance,
      currentBalance: currentLedger,
      totalOutstanding: currentLedger,
    };
  }

  const previousBalance = currentLedger;
  const currentBalance = currentLedger + balanceDue;
  return {
    previousBalance,
    currentBalance,
    totalOutstanding: currentBalance,
  };
}

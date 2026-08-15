const TOLERANCE = 0.01;

function computePaymentStatus(paidAmount, totalAmount) {
  if (paidAmount <= 0) return "unpaid";
  if (paidAmount + TOLERANCE >= totalAmount) return "paid";
  return "partial";
}

/** Normalize paid amount / status for display (handles legacy rows missing paymentStatus). */
export function resolveSalePayment(sale) {
  const totalAmount = Number(sale?.totalAmount) || 0;
  const cashAmount = Number(sale?.cashAmount) || 0;
  const bankAmount = Number(sale?.bankAmount) || 0;
  const paidFromSplit = cashAmount + bankAmount;
  const paidAmount = Math.max(Number(sale?.paidAmount) || 0, paidFromSplit);

  const paymentStatus = computePaymentStatus(paidAmount, totalAmount);
  const balanceDue = Math.max(totalAmount - paidAmount, 0);

  return {
    totalAmount,
    cashAmount,
    bankAmount,
    paidAmount,
    paymentStatus,
    balanceDue,
  };
}

export function salePaymentStatusLabel(status) {
  const map = { paid: "Paid", partial: "Partial", unpaid: "Unpaid" };
  return map[status] || "Unpaid";
}

export function computeSalePaymentStatus(paidAmount, totalAmount) {
  return computePaymentStatus(paidAmount, totalAmount);
}

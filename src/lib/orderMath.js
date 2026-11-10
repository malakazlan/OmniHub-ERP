/** Pure order/invoice math — safe for client components (no DB imports). */

export function parseNum(val, fallback = 0) {
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : fallback;
}

export function computeItemSubtotal(items) {
  return items.reduce((sum, item) => {
    const qty = parseNum(item.quantity);
    const rate = parseNum(item.rate);
    const amount =
      item.amount !== undefined && item.amount !== null ? parseNum(item.amount) : qty * rate;
    return sum + amount;
  }, 0);
}

export function normalizeItems(items) {
  return items.map((item) => {
    const quantity = parseNum(item.quantity);
    const rate = parseNum(item.rate);
    const amount =
      item.amount !== undefined && item.amount !== null ? parseNum(item.amount) : quantity * rate;
    return {
      productId: parseInt(item.productId, 10),
      productName: item.productName || "",
      quantity,
      unit: item.unit || "ea",
      rate,
      amount,
    };
  });
}

export function computePaymentStatus(paidAmount, totalAmount) {
  if (paidAmount <= 0) return "unpaid";
  if (paidAmount >= totalAmount) return "paid";
  return "partial";
}

export function shouldApplyPurchaseEffects(status) {
  return status === "confirmed" || status === "received";
}

export function shouldApplySaleEffects(status) {
  return status === "confirmed" || status === "dispatched" || status === "delivered";
}

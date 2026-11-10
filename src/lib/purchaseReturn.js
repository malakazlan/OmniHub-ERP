import { parseNum, computePaymentStatus } from "@/lib/orderMath";

export function parseReturnItems(purchaseReturn) {
  try {
    return JSON.parse(purchaseReturn?.items || "[]");
  } catch {
    return [];
  }
}

export function aggregateReturnedQuantities(returns = []) {
  const byProduct = {};
  for (const record of returns) {
    for (const item of parseReturnItems(record)) {
      const productId = parseInt(item.productId, 10);
      if (!productId) continue;
      byProduct[productId] = (byProduct[productId] || 0) + parseNum(item.quantity);
    }
  }
  return byProduct;
}

export function computeGrossPurchaseTotal(purchase, purchaseItems = []) {
  const itemsSubtotal = purchaseItems.reduce((sum, row) => sum + parseNum(row.amount), 0);
  return Math.max(
    itemsSubtotal +
      parseNum(purchase.transportCost) +
      parseNum(purchase.loadingCost) +
      parseNum(purchase.labourCost) +
      parseNum(purchase.taxAmount) -
      parseNum(purchase.discountAmount),
    0
  );
}

export function computeGrossPurchaseSubtotal(purchaseItems = []) {
  return purchaseItems.reduce((sum, row) => sum + parseNum(row.amount), 0);
}

export function computeNetTotalsAfterReturns({
  grossTotal,
  grossSubtotal,
  totalReturned,
  paidAmount,
}) {
  const newTotalAmount = Math.max(parseNum(grossTotal) - parseNum(totalReturned), 0);
  const newSubtotal = Math.max(parseNum(grossSubtotal) - parseNum(totalReturned), 0);
  const paymentStatus = computePaymentStatus(parseNum(paidAmount), newTotalAmount);

  return {
    totalAmount: newTotalAmount,
    subtotal: newSubtotal,
    paymentStatus,
    totalReturned: parseNum(totalReturned),
  };
}

export function computeMaxReturnableQuantity(purchasedQty, alreadyReturned, currentStock) {
  const remainingOnBill = Math.max(parseNum(purchasedQty) - parseNum(alreadyReturned), 0);
  return Math.max(0, Math.min(remainingOnBill, parseNum(currentStock)));
}

export function validatePurchaseReturnItems(
  purchaseItems,
  priorReturned,
  newItems,
  stockByProductId = null
) {
  for (const item of newItems) {
    const purchased = purchaseItems.find((row) => row.productId === item.productId);
    if (!purchased) {
      throw new Error(`Item ${item.productName || item.productId} is not on this bill`);
    }

    const alreadyReturned = priorReturned[item.productId] || 0;
    const remaining = parseNum(purchased.quantity) - alreadyReturned;

    if (item.quantity > remaining + 0.0001) {
      throw new Error(
        `Return quantity ${item.quantity} exceeds remaining ${remaining} for ${purchased.productName}`
      );
    }

    if (stockByProductId != null) {
      const inStock = parseNum(stockByProductId[item.productId]);
      const maxReturnable = computeMaxReturnableQuantity(
        purchased.quantity,
        alreadyReturned,
        inStock
      );
      if (item.quantity > maxReturnable + 0.0001) {
        throw new Error(
          `Insufficient stock to return ${purchased.productName}. In stock: ${inStock}, max returnable: ${maxReturnable}`
        );
      }
    }
  }
}

export function normalizePurchaseReturns(returns = []) {
  return returns.map((record) => ({
    ...record,
    items: Array.isArray(record.items) ? record.items : parseReturnItems(record),
  }));
}

export function buildPurchaseLineItems(purchaseItems = [], returns = []) {
  const normalizedReturns = normalizePurchaseReturns(returns);
  const returnedQty = aggregateReturnedQuantities(normalizedReturns);

  const netItems = purchaseItems
    .map((item) => {
      const boughtQty = parseNum(item.quantity);
      const returned = returnedQty[item.productId] || 0;
      const netQty = Math.max(boughtQty - returned, 0);
      const rate = parseNum(item.rate);
      const netAmount =
        boughtQty > 0 ? parseNum(item.amount) * (netQty / boughtQty) : netQty * rate;

      return {
        ...item,
        boughtQuantity: boughtQty,
        returnedQuantity: returned,
        quantity: netQty,
        amount: Math.round(netAmount * 100) / 100,
      };
    })
    .filter((item) => item.quantity > 0);

  const totalReturned = normalizedReturns.reduce(
    (sum, row) => sum + parseNum(row.returnAmount),
    0
  );

  return { netItems, totalReturned };
}

export function computeMaxReturnRefund(purchase, returnAmount, newTotalAmount) {
  const overpaid = Math.max(parseNum(purchase.paidAmount) - parseNum(newTotalAmount), 0);
  return Math.min(parseNum(returnAmount), overpaid);
}

export function computeMaxReturnRefundBeforeReturn(purchase, returnAmount) {
  const projectedTotal = Math.max(parseNum(purchase.totalAmount) - parseNum(returnAmount), 0);
  return computeMaxReturnRefund(purchase, returnAmount, projectedTotal);
}

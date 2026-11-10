import { parseNum, computePaymentStatus } from "@/lib/orderMath";

export function parseReturnItems(saleReturn) {
  try {
    return JSON.parse(saleReturn?.items || "[]");
  } catch {
    return [];
  }
}

/** Sum returned quantity per productId across all return records. */
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

/** Gross invoice total from original line items + charges (unchanged by returns). */
export function computeGrossSaleTotal(sale, saleItems = []) {
  const itemsSubtotal = saleItems.reduce((sum, row) => sum + parseNum(row.amount), 0);
  return Math.max(
    itemsSubtotal +
      parseNum(sale.transportCost) +
      parseNum(sale.loadingCost) +
      parseNum(sale.taxAmount) -
      parseNum(sale.discountAmount),
    0
  );
}

export function computeGrossSaleSubtotal(saleItems = []) {
  return saleItems.reduce((sum, row) => sum + parseNum(row.amount), 0);
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

export function validateSaleReturnItems(saleItems, priorReturned, newItems) {
  for (const item of newItems) {
    const sold = saleItems.find((row) => row.productId === item.productId);
    if (!sold) {
      throw new Error(`Item ${item.productName || item.productId} is not on this invoice`);
    }

    const alreadyReturned = priorReturned[item.productId] || 0;
    const remaining = parseNum(sold.quantity) - alreadyReturned;

    if (item.quantity > remaining + 0.0001) {
      throw new Error(
        `Return quantity ${item.quantity} exceeds remaining ${remaining} for ${sold.productName}`
      );
    }
  }
}

/** Keep invoice totals/payment status aligned with all recorded returns. */
export async function reconcileSaleOrderWithReturns(tx, saleId) {
  const sale = await tx.saleOrder.findUnique({
    where: { id: saleId },
    include: { items: true, returns: true },
  });

  if (!sale) return null;

  const totalReturned = sale.returns.reduce((sum, row) => sum + parseNum(row.returnAmount), 0);
  const grossTotal = computeGrossSaleTotal(sale, sale.items);
  const grossSubtotal = computeGrossSaleSubtotal(sale.items);
  const next = computeNetTotalsAfterReturns({
    grossTotal,
    grossSubtotal,
    totalReturned,
    paidAmount: sale.paidAmount,
  });

  const needsUpdate =
    Math.abs(parseNum(sale.totalAmount) - next.totalAmount) > 0.01 ||
    Math.abs(parseNum(sale.subtotal) - next.subtotal) > 0.01 ||
    sale.paymentStatus !== next.paymentStatus;

  if (!needsUpdate) return sale;

  return tx.saleOrder.update({
    where: { id: saleId },
    data: {
      totalAmount: next.totalAmount,
      subtotal: next.subtotal,
      paymentStatus: next.paymentStatus,
    },
    include: { items: true, returns: true },
  });
}

export async function applySaleReturnToOrder(tx, { sale, saleItems }) {
  const existingReturns = await tx.saleReturn.findMany({
    where: { originalSaleId: sale.id },
  });

  const totalReturned = existingReturns.reduce(
    (sum, row) => sum + parseNum(row.returnAmount),
    0
  );

  const grossTotal = computeGrossSaleTotal(sale, saleItems);
  const grossSubtotal = computeGrossSaleSubtotal(saleItems);
  const next = computeNetTotalsAfterReturns({
    grossTotal,
    grossSubtotal,
    totalReturned,
    paidAmount: sale.paidAmount,
  });

  return tx.saleOrder.update({
    where: { id: sale.id },
    data: {
      totalAmount: next.totalAmount,
      subtotal: next.subtotal,
      paymentStatus: next.paymentStatus,
    },
  });
}

/** Normalize returns array (parsed or JSON string items). */
export function normalizeSaleReturns(returns = []) {
  return returns.map((record) => ({
    ...record,
    items: Array.isArray(record.items) ? record.items : parseReturnItems(record),
  }));
}

/** Build net invoice line items and return rows for display/PDF. */
export function buildInvoiceLineItems(saleItems = [], returns = []) {
  const normalizedReturns = normalizeSaleReturns(returns);
  const returnedQty = aggregateReturnedQuantities(normalizedReturns);

  const netItems = saleItems
    .map((item) => {
      const soldQty = parseNum(item.quantity);
      const returned = returnedQty[item.productId] || 0;
      const netQty = Math.max(soldQty - returned, 0);
      const rate = parseNum(item.rate);
      const netAmount =
        soldQty > 0 ? parseNum(item.amount) * (netQty / soldQty) : netQty * rate;

      return {
        ...item,
        soldQuantity: soldQty,
        returnedQuantity: returned,
        quantity: netQty,
        amount: Math.round(netAmount * 100) / 100,
      };
    })
    .filter((item) => item.quantity > 0);

  const returnEntries = normalizedReturns.flatMap((record) =>
    parseReturnItems(record).map((item) => ({
      returnNumber: record.returnNumber,
      returnDate: record.returnDate,
      productId: item.productId,
      productName: item.productName,
      quantity: parseNum(item.quantity),
      unit: item.unit,
      rate: parseNum(item.rate),
      amount: parseNum(item.amount) || parseNum(item.quantity) * parseNum(item.rate),
    }))
  );

  const totalReturned = normalizedReturns.reduce(
    (sum, row) => sum + parseNum(row.returnAmount),
    0
  );

  return { netItems, returnEntries, totalReturned };
}

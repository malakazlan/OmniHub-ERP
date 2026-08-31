/** Pure ledger display helpers — safe for client components (no DB imports). */

export function serializeLedgerLineItems(items = []) {
  if (!items?.length) return null;
  return JSON.stringify(
    items.map((item) => ({
      name: item.productName || item.name,
      quantity: item.quantity,
      unit: item.unit || "piece",
      rate: item.rate,
      amount: item.amount,
    }))
  );
}

export function parseLedgerLineItems(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Main bill posting lines (not payment-on-bill legs). */
export function isMainBillLedgerEntry(entry) {
  if (!entry?.referenceType || !entry.referenceId) return false;
  const desc = entry.description || "";
  if (entry.referenceType === "PurchaseOrder") {
    return /^Purchase\s/i.test(desc);
  }
  if (entry.referenceType === "SaleOrder") {
    return /^Sale\s/i.test(desc);
  }
  return false;
}

export function isMainSaleReturnLedgerEntry(entry) {
  if (!entry?.referenceType || !entry.referenceId) return false;
  return entry.referenceType === "SaleReturn" && /^Sale return/i.test(entry.description || "");
}

export function isMainPurchaseReturnLedgerEntry(entry) {
  if (!entry?.referenceType || !entry.referenceId) return false;
  return entry.referenceType === "PurchaseReturn" && /^Purchase return/i.test(entry.description || "");
}

export function ledgerEntryOpensInvoice(entry) {
  if (entry?.docType) {
    return (
      entry.docType === "purchase" ||
      entry.docType === "sale" ||
      entry.docType === "payment" ||
      entry.docType === "sale_return" ||
      entry.docType === "purchase_return"
    );
  }
  if (!entry?.referenceType || !entry.referenceId) return false;
  return (
    entry.referenceType === "PurchaseOrder" ||
    entry.referenceType === "SaleOrder" ||
    entry.referenceType === "Payment" ||
    entry.referenceType === "SaleReturn" ||
    entry.referenceType === "PurchaseReturn"
  );
}

export function mapPurchaseItemForLedger(item) {
  return {
    name: item.productName,
    quantity: item.quantity,
    unit: item.unit,
    rate: item.rate,
    amount: item.amount,
  };
}

export function mapSaleItemForLedger(item) {
  return {
    name: item.productName,
    quantity: item.quantity,
    unit: item.unit,
    rate: item.rate,
    amount: item.amount,
  };
}

export function mapReturnItemForLedger(item) {
  return {
    name: item.productName,
    quantity: item.quantity,
    unit: item.unit,
    rate: item.rate,
    amount: item.amount ?? item.quantity * item.rate,
  };
}

/**
 * Show line items as they were when this ledger row was posted.
 * Uses stored snapshot when available; otherwise scales current bill lines
 * to match this entry's debit/credit (fixes post-correction display).
 */
export function resolveHistoricalLineItems(entry, rawItems, orderTotal, mapItem) {
  const stored = parseLedgerLineItems(entry.lineItems);
  if (stored?.length) return stored;

  const mapped = rawItems.map(mapItem);
  if (!mapped.length) return mapped;

  const orderTotalNum = parseFloat(orderTotal) || 0;
  const entryAmount = Math.max(parseFloat(entry.credit) || 0, parseFloat(entry.debit) || 0);
  if (orderTotalNum <= 0 || entryAmount <= 0) return mapped;
  if (Math.abs(entryAmount - orderTotalNum) < 0.02) return mapped;

  const ratio = entryAmount / orderTotalNum;
  return mapped.map((item) => ({
    ...item,
    quantity: Math.round(item.quantity * ratio * 1000) / 1000,
    amount: Math.round(item.amount * ratio * 100) / 100,
  }));
}

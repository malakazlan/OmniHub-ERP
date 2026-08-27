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

export function ledgerEntryOpensInvoice(entry) {
  if (entry?.docType) {
    return entry.docType === "purchase" || entry.docType === "sale" || entry.docType === "payment";
  }
  if (!entry?.referenceType || !entry.referenceId) return false;
  return (
    entry.referenceType === "PurchaseOrder" ||
    entry.referenceType === "SaleOrder" ||
    entry.referenceType === "Payment"
  );
}

function groupItemsByOrderId(items, key) {
  const map = new Map();
  for (const item of items) {
    const id = item[key];
    if (!map.has(id)) map.set(id, []);
    map.get(id).push(item);
  }
  return map;
}

function mapPurchaseItem(item) {
  return {
    name: item.productName,
    quantity: item.quantity,
    unit: item.unit,
    rate: item.rate,
    amount: item.amount,
  };
}

function mapSaleItem(item) {
  return {
    name: item.productName,
    quantity: item.quantity,
    unit: item.unit,
    rate: item.rate,
    amount: item.amount,
  };
}

/** Attach lineItems to purchase/sale bill ledger rows for display. */
export async function enrichLedgerEntriesWithLineItems(db, entries) {
  const purchaseIds = new Set();
  const saleIds = new Set();

  for (const entry of entries) {
    if (!isMainBillLedgerEntry(entry)) continue;
    if (entry.referenceType === "PurchaseOrder") purchaseIds.add(entry.referenceId);
    if (entry.referenceType === "SaleOrder") saleIds.add(entry.referenceId);
  }

  const [purchaseItems, saleItems] = await Promise.all([
    purchaseIds.size
      ? db.purchaseItem.findMany({
          where: { purchaseOrderId: { in: [...purchaseIds] } },
          orderBy: { id: "asc" },
        })
      : [],
    saleIds.size
      ? db.saleItem.findMany({
          where: { saleOrderId: { in: [...saleIds] } },
          orderBy: { id: "asc" },
        })
      : [],
  ]);

  const purchaseMap = groupItemsByOrderId(purchaseItems, "purchaseOrderId");
  const saleMap = groupItemsByOrderId(saleItems, "saleOrderId");

  return entries.map((entry) => {
    if (!isMainBillLedgerEntry(entry)) return entry;

    if (entry.referenceType === "PurchaseOrder") {
      const lineItems = (purchaseMap.get(entry.referenceId) || []).map(mapPurchaseItem);
      return { ...entry, lineItems, documentType: "purchase" };
    }

    if (entry.referenceType === "SaleOrder") {
      const lineItems = (saleMap.get(entry.referenceId) || []).map(mapSaleItem);
      return { ...entry, lineItems, documentType: "sale" };
    }

    return entry;
  });
}

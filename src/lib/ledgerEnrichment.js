import {
  isMainBillLedgerEntry,
  isMainSaleReturnLedgerEntry,
  isMainPurchaseReturnLedgerEntry,
  mapPurchaseItemForLedger,
  mapSaleItemForLedger,
  mapReturnItemForLedger,
  resolveHistoricalLineItems,
} from "@/lib/ledgerDisplay";

export {
  isMainBillLedgerEntry,
  isMainSaleReturnLedgerEntry,
  isMainPurchaseReturnLedgerEntry,
  ledgerEntryOpensInvoice,
} from "@/lib/ledgerDisplay";

function groupItemsByOrderId(items, key) {
  const map = new Map();
  for (const item of items) {
    const id = item[key];
    if (!map.has(id)) map.set(id, []);
    map.get(id).push(item);
  }
  return map;
}

/** Attach lineItems to purchase/sale bill and return ledger rows for display. */
export async function enrichLedgerEntriesWithLineItems(db, entries) {
  const purchaseIds = new Set();
  const saleIds = new Set();
  const saleReturnIds = new Set();
  const purchaseReturnIds = new Set();

  for (const entry of entries) {
    if (isMainBillLedgerEntry(entry)) {
      if (entry.referenceType === "PurchaseOrder") purchaseIds.add(entry.referenceId);
      if (entry.referenceType === "SaleOrder") saleIds.add(entry.referenceId);
    }
    if (isMainSaleReturnLedgerEntry(entry)) saleReturnIds.add(entry.referenceId);
    if (isMainPurchaseReturnLedgerEntry(entry)) purchaseReturnIds.add(entry.referenceId);
  }

  const [purchaseItems, saleItems, saleReturns, purchaseReturns, purchases, sales] = await Promise.all([
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
    saleReturnIds.size
      ? db.saleReturn.findMany({
          where: { id: { in: [...saleReturnIds] } },
        })
      : [],
    purchaseReturnIds.size
      ? db.purchaseReturn.findMany({
          where: { id: { in: [...purchaseReturnIds] } },
        })
      : [],
    purchaseIds.size
      ? db.purchaseOrder.findMany({
          where: { id: { in: [...purchaseIds] } },
          select: { id: true, totalAmount: true },
        })
      : [],
    saleIds.size
      ? db.saleOrder.findMany({
          where: { id: { in: [...saleIds] } },
          select: { id: true, totalAmount: true },
        })
      : [],
  ]);

  const purchaseMap = groupItemsByOrderId(purchaseItems, "purchaseOrderId");
  const saleMap = groupItemsByOrderId(saleItems, "saleOrderId");
  const purchaseTotalMap = new Map(purchases.map((p) => [p.id, p.totalAmount]));
  const saleTotalMap = new Map(sales.map((s) => [s.id, s.totalAmount]));

  const saleReturnMap = new Map();
  for (const record of saleReturns) {
    try {
      const items = JSON.parse(record.items || "[]");
      saleReturnMap.set(record.id, items.map(mapReturnItemForLedger));
    } catch {
      saleReturnMap.set(record.id, []);
    }
  }

  const purchaseReturnMap = new Map();
  for (const record of purchaseReturns) {
    try {
      const items = JSON.parse(record.items || "[]");
      purchaseReturnMap.set(record.id, items.map(mapReturnItemForLedger));
    } catch {
      purchaseReturnMap.set(record.id, []);
    }
  }

  return entries.map((entry) => {
    if (isMainBillLedgerEntry(entry)) {
      if (entry.referenceType === "PurchaseOrder") {
        const rawItems = purchaseMap.get(entry.referenceId) || [];
        const lineItems = resolveHistoricalLineItems(
          entry,
          rawItems,
          purchaseTotalMap.get(entry.referenceId),
          mapPurchaseItemForLedger
        );
        return { ...entry, lineItems, documentType: "purchase" };
      }

      if (entry.referenceType === "SaleOrder") {
        const rawItems = saleMap.get(entry.referenceId) || [];
        const lineItems = resolveHistoricalLineItems(
          entry,
          rawItems,
          saleTotalMap.get(entry.referenceId),
          mapSaleItemForLedger
        );
        return { ...entry, lineItems, documentType: "sale" };
      }
    }

    if (isMainSaleReturnLedgerEntry(entry)) {
      const lineItems = saleReturnMap.get(entry.referenceId) || [];
      return {
        ...entry,
        lineItems,
        documentType: "sale_return",
        saleReturnId: entry.referenceId,
      };
    }

    if (isMainPurchaseReturnLedgerEntry(entry)) {
      const lineItems = purchaseReturnMap.get(entry.referenceId) || [];
      return {
        ...entry,
        lineItems,
        documentType: "purchase_return",
        purchaseReturnId: entry.referenceId,
      };
    }

    return entry;
  });
}

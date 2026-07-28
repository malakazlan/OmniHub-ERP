/**
 * Map a ledger row to a viewable source document (if any).
 */
export function resolveLedgerDocument(entry) {
  if (!entry?.referenceType || !entry.referenceId) return null;

  switch (entry.referenceType) {
    case "PurchaseOrder":
      return { type: "purchase", id: entry.referenceId, label: "Purchase bill" };
    case "SaleOrder":
      return { type: "sale", id: entry.referenceId, label: "Sales invoice" };
    case "Payment":
      return { type: "payment", id: entry.referenceId, label: "Payment voucher" };
    default:
      return null;
  }
}

export function ledgerEntryHasDocument(entry) {
  return Boolean(resolveLedgerDocument(entry));
}

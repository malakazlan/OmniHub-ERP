import { formatCurrency, formatDate } from "@/lib/formatters";

/** Compact one-line particulars for print / PDF / screen summary. */
export function formatLedgerParticularsText(entry) {
  const parts = [];
  if (entry.description) parts.push(entry.description);
  if (entry.reference) parts.push(entry.reference);

  const items = (entry.lineItems || [])
    .map((i) => {
      const qty = i.unit ? `${i.quantity} ${i.unit}` : String(i.quantity);
      return `${i.name} (${qty} × ${formatCurrency(i.rate)})`;
    })
    .join("; ");

  if (items) parts.push(items);
  return parts.join(" · ") || "—";
}

export function formatLedgerAccountLabel(entry) {
  const name = entry.account?.name || "—";
  const code = entry.account?.code;
  return code ? `${name} (${code})` : name;
}

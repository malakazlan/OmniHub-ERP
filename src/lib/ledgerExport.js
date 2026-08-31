import { formatCurrency, formatDate } from "@/lib/formatters";

export const LEDGER_CATEGORY_OPTIONS = [
  { value: "", label: "All categories" },
  { value: "farmer", label: "Farmers" },
  { value: "company", label: "Companies" },
  { value: "shop", label: "Shops" },
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
  { value: "transport", label: "Drivers" },
  { value: "salary", label: "Employees" },
  { value: "general", label: "General" },
];

export const LEDGER_ENTRY_TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "purchase", label: "Purchases" },
  { value: "sale", label: "Sales" },
  { value: "payment", label: "Payments" },
  { value: "other", label: "Other" },
];

export function getLedgerEntryType(entry) {
  if (entry.referenceType === "PurchaseOrder") return "purchase";
  if (entry.referenceType === "SaleOrder") return "sale";
  if (entry.referenceType === "SaleReturn") return "sale_return";
  if (entry.referenceType === "PurchaseReturn") return "purchase_return";
  if (entry.referenceType === "Payment") return "payment";
  return "other";
}

export function filterLedgerEntries(entries, filters, accountPhone = "") {
  const {
    search = "",
    category = "",
    entryType = "",
    dateFrom = "",
    dateTo = "",
  } = filters;

  let result = entries;

  if (dateFrom) {
    const from = new Date(dateFrom);
    from.setHours(0, 0, 0, 0);
    result = result.filter((e) => new Date(e.date) >= from);
  }
  if (dateTo) {
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);
    result = result.filter((e) => new Date(e.date) <= to);
  }

  if (category) {
    result = result.filter((e) => (e.account?.category || "") === category);
  }

  if (entryType) {
    result = result.filter((e) => getLedgerEntryType(e) === entryType);
  }

  const q = search.trim().toLowerCase();
  if (q) {
    result = result.filter((e) => {
      const haystack = [
        e.description,
        e.reference,
        e.account?.name,
        e.account?.code,
        e.account?.phone,
        accountPhone,
        ...(e.lineItems || []).map((i) => i.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  return result;
}

/** Accounts visible in search dropdown — respects category, entry type, and date filters. */
export function filterAccountsForLedger(accounts, entries, filters = {}) {
  const { category = "", entryType = "", dateFrom = "", dateTo = "" } = filters;

  let pool = accounts;
  if (category) {
    pool = pool.filter((a) => a.category === category);
  }

  const needsEntryScope = Boolean(entryType || dateFrom || dateTo);
  if (needsEntryScope) {
    let scoped = entries;
    if (entryType) {
      scoped = scoped.filter((e) => getLedgerEntryType(e) === entryType);
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      scoped = scoped.filter((e) => new Date(e.date) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      scoped = scoped.filter((e) => new Date(e.date) <= to);
    }
    const ids = new Set(
      scoped.map((e) => e.accountId ?? e.account?.id).filter((id) => id != null)
    );
    pool = ids.size > 0 ? pool.filter((a) => ids.has(a.id)) : [];
  }

  return pool;
}

function escapeCsv(val) {
  const s = String(val ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadLedgerCsv({
  entries,
  showAccountColumn,
  accountName,
  accountPhone,
  filename = "general-ledger.csv",
}) {
  const headers = [
    "#",
    "Date",
    ...(showAccountColumn ? ["Account", "Category", "Phone", "Code"] : []),
    "Reference",
    "Type",
    "Particulars",
    "Debit",
    "Credit",
    "Balance",
  ];

  const rows = entries.map((e, idx) => {
    const itemsSummary = (e.lineItems || [])
      .map((i) => `${i.name} ${i.quantity}×${i.rate}=${i.amount}`)
      .join("; ");
    const particulars = [e.description, itemsSummary].filter(Boolean).join(" | ");
    return [
      idx + 1,
      formatDate(e.date),
      ...(showAccountColumn
        ? [
            e.account?.name || "",
            e.account?.category || "",
            e.account?.phone || "",
            e.account?.code || "",
          ]
        : []),
      e.reference || "",
      getLedgerEntryType(e),
      particulars,
      e.debit > 0 ? e.debit.toFixed(2) : "",
      e.credit > 0 ? e.credit.toFixed(2) : "",
      (e.balance ?? 0).toFixed(2),
    ];
  });

  const totalDebit = entries.reduce((s, e) => s + (e.debit || 0), 0);
  const totalCredit = entries.reduce((s, e) => s + (e.credit || 0), 0);
  rows.push([
    "",
    "",
    ...(showAccountColumn ? ["", "", "", ""] : []),
    "",
    "TOTALS",
    accountName ? `Ledger: ${accountName}` : "General ledger",
    totalDebit.toFixed(2),
    totalCredit.toFixed(2),
    "",
  ]);

  const meta = [
    ["General Ledger Export"],
    ["Account", accountName || "All accounts"],
    ["Phone", accountPhone || ""],
    ["Exported", new Date().toLocaleString()],
    [],
  ];

  const csv = [...meta, headers, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ledgerPrintTitle(account, companyName) {
  const parts = [companyName || "Warraich Traders", "General Ledger"];
  if (account?.name) parts.push(account.name);
  return parts.join(" — ");
}

export function formatLedgerTotals(entries) {
  const debit = entries.reduce((s, e) => s + (e.debit || 0), 0);
  const credit = entries.reduce((s, e) => s + (e.credit || 0), 0);
  return { debit, credit, net: debit - credit };
}

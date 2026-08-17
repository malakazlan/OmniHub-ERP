"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import ReportShell from "@/components/reports/ReportShell";
import { useRegisterExport } from "@/hooks/useRegisterExport";
import { Banknote, Building2, Hash, Wallet, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { getLedgerEntryType } from "@/lib/ledgerExport";

const TABS = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "bank", label: "Bank", icon: Building2 },
];

function entryParticulars(entry) {
  const items = (entry.lineItems || [])
    .map((i) => `${i.name} ${i.quantity}×${i.rate}`)
    .join("; ");
  return [entry.description, items].filter(Boolean).join(" · ");
}

function buildPrintColumns(showAccount) {
  const cols = [
    { key: "date", label: "Date", get: (r) => formatDate(r.date), pdfWidth: 22 },
  ];
  if (showAccount) {
    cols.push({ key: "account", label: "Account", get: (r) => r.account?.name || "—", pdfWidth: 32 });
  }
  cols.push(
    { key: "ref", label: "Reference", get: (r) => r.reference || "—", pdfWidth: 24 },
    { key: "type", label: "Type", get: (r) => getLedgerEntryType(r), pdfWidth: 18 },
    { key: "desc", label: "Particulars", get: (r) => entryParticulars(r), pdfWidth: 44 },
    {
      key: "receipt",
      label: "Receipt",
      align: "right",
      get: (r) => (r.debit > 0 ? formatCurrency(r.debit) : "—"),
      pdfWidth: 24,
    },
    {
      key: "payment",
      label: "Payment",
      align: "right",
      get: (r) => (r.credit > 0 ? formatCurrency(r.credit) : "—"),
      pdfWidth: 24,
    },
    {
      key: "bal",
      label: "Balance",
      align: "right",
      get: (r) => formatCurrency(r.balance),
      pdfWidth: 26,
      bold: true,
    }
  );
  return cols;
}

export default function CashBankReportPage() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const printRef = useRef(null);

  const initialCategory = searchParams.get("category") === "bank" ? "bank" : "cash";

  const [category, setCategory] = useState(initialCategory);
  const [summary, setSummary] = useState({});
  const [accounts, setAccounts] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [accountId, setAccountId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [companySettings, setCompanySettings] = useState(null);

  const fetchReport = useCallback(
    async (cat = category, fromVal = from, toVal = to, accountVal = accountId) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ category: cat });
        if (fromVal) params.set("from", fromVal);
        if (toVal) params.set("to", toVal);
        if (accountVal) params.set("accountId", accountVal);
        const res = await fetch(`/api/reports/cash-bank?${params.toString()}`);
        const data = await res.json();
        if (res.ok) {
          setSummary(data.summary || {});
          setAccounts(data.accounts || []);
          setEntries(data.entries || []);
        } else {
          showToast(data.error || "Failed to load report", "error");
        }
      } catch {
        showToast("Error connecting to server", "error");
      } finally {
        setLoading(false);
      }
    },
    [category, from, to, accountId, showToast]
  );

  useEffect(() => {
    fetchReport(initialCategory, "", "", "");
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) setCompanySettings(d.settings);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onTabChange = (next) => {
    setCategory(next);
    setAccountId("");
    fetchReport(next, from, to, "");
  };

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return entries;
    return entries.filter((e) => {
      const haystack = [
        e.description,
        e.reference,
        e.account?.name,
        e.account?.code,
        getLedgerEntryType(e),
        ...(e.lineItems || []).map((i) => i.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [entries, searchQuery]);

  const filteredTotals = useMemo(
    () => ({
      receipts: filtered.reduce((s, e) => s + (e.debit || 0), 0),
      payments: filtered.reduce((s, e) => s + (e.credit || 0), 0),
    }),
    [filtered]
  );

  const showAccountColumn = !accountId;
  const printColumns = useMemo(() => buildPrintColumns(showAccountColumn), [showAccountColumn]);
  const reportTitle = category === "cash" ? "Cash Report" : "Bank Report";

  const { pdfLoading, onPrint, onExportPdf } = useRegisterExport({
    printRef,
    title: reportTitle,
    subtitle: `${filtered.length} ledger entries`,
    company: companySettings,
    columns: printColumns,
    rows: filtered,
    footers: [
      {
        label: "Totals",
        value: `${formatCurrency(filteredTotals.receipts)} / ${formatCurrency(filteredTotals.payments)}`,
        valueColumn: "bal",
        labelColumn: showAccountColumn ? "account" : "type",
      },
    ],
    filename: `${category}-report.pdf`,
  });

  const TabIcon = category === "cash" ? Banknote : Building2;

  return (
    <ReportShell
      badge="Finance"
      badgeIcon={TabIcon}
      title={category === "cash" ? "Cash report" : "Bank report"}
      description="Cash and bank ledger movements with receipts, payments, and running balances."
      filterBar={
        <div className="space-y-3">
          <div className="erp-reports-filter-bar">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`erp-reports-tab${category === tab.id ? " is-active" : ""}`}
                  onClick={() => onTabChange(tab.id)}
                >
                  <Icon className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div className="erp-reports-filter-bar flex-wrap items-end gap-3">
            <div className="erp-reports-filter-field">
              <label>From</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="erp-finance-input" />
            </div>
            <div className="erp-reports-filter-field">
              <label>To</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="erp-finance-input" />
            </div>
            <button
              type="button"
              onClick={() => fetchReport(category, from, to, accountId)}
              className="erp-reports-tab is-active px-4 py-2 bg-acc-accounts text-white border-0"
            >
              Apply filter
            </button>
            {(from || to) && (
              <button
                type="button"
                onClick={() => {
                  setFrom("");
                  setTo("");
                  fetchReport(category, "", "", accountId);
                }}
                className="text-xs text-slate-500 hover:text-slate-800 underline pb-2"
              >
                Clear dates
              </button>
            )}
            <div className="erp-reports-filter-field">
              <label>Account</label>
              <select
                className="erp-finance-input min-w-[200px]"
                value={accountId}
                onChange={(e) => {
                  const next = e.target.value;
                  setAccountId(next);
                  fetchReport(category, from, to, next);
                }}
              >
                <option value="">All {category} accounts</option>
                {accounts.map((a) => (
                  <option key={a.id} value={String(a.id)}>
                    {a.name}
                    {a.code ? ` (${a.code})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      }
      stats={[
        { label: "Accounts", value: summary.accountCount ?? 0, icon: Hash },
        {
          label: "Current balance",
          value: formatCurrency(summary.totalBalance ?? 0),
          icon: Wallet,
        },
        {
          label: "Receipts",
          value: formatCurrency(summary.receipts ?? 0),
          icon: ArrowDownCircle,
          valueClass: "text-emerald-700",
        },
        {
          label: "Payments",
          value: formatCurrency(summary.payments ?? 0),
          icon: ArrowUpCircle,
          valueClass: "text-red-600",
        },
      ]}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search reference, particulars, account..."
      registerTitle={`${category === "cash" ? "Cash" : "Bank"} ledger register`}
      registerMeta={`${filtered.length} entries`}
      onPrint={onPrint}
      onExportPdf={onExportPdf}
      pdfLoading={pdfLoading}
      exportCount={filtered.length}
      loadingOnly={loading && entries.length === 0}
      printRef={printRef}
      companySettings={companySettings}
      printColumns={printColumns}
      printRows={filtered}
      printFooters={[
        {
          label: "Receipts / Payments",
          value: `${formatCurrency(filteredTotals.receipts)} / ${formatCurrency(filteredTotals.payments)}`,
          valueColumn: "bal",
          labelColumn: showAccountColumn ? "account" : "type",
        },
      ]}
    >
      {accounts.length > 0 && !accountId && (
        <div className="erp-reports-category-bar">
          {accounts.map((a) => (
            <div key={a.id} className="erp-reports-category-chip">
              <span>{a.name}</span>
              <strong>{formatCurrency(a.balance)}</strong>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="h-48 flex items-center justify-center text-slate-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-500 py-12 text-center">
          No {category} ledger entries found for the selected filters.
        </p>
      ) : (
        <div className="erp-accounts-grid-wrap">
          <div className="erp-accounts-grid-scroll">
            <table className="erp-ledger-grid erp-reports-grid is-accounts">
              <thead>
                <tr>
                  <th className="erp-lg-th erp-lg-th-num">#</th>
                  <th className="erp-lg-th">Date</th>
                  {showAccountColumn && <th className="erp-lg-th">Account</th>}
                  <th className="erp-lg-th">Reference</th>
                  <th className="erp-lg-th">Type</th>
                  <th className="erp-lg-th">Particulars</th>
                  <th className="erp-lg-th erp-lg-th-money">Receipt</th>
                  <th className="erp-lg-th erp-lg-th-money">Payment</th>
                  <th className="erp-lg-th erp-lg-th-money">Balance</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, idx) => (
                  <tr key={row.id} className="erp-lg-row">
                    <td className="erp-lg-td erp-lg-td-num text-slate-400">{idx + 1}</td>
                    <td className="erp-lg-td erp-lg-td-date">{formatDate(row.date)}</td>
                    {showAccountColumn && (
                      <td className="erp-lg-td text-sm text-slate-800">{row.account?.name || "—"}</td>
                    )}
                    <td className="erp-lg-td font-mono text-xs text-slate-600">{row.reference || "—"}</td>
                    <td className="erp-lg-td text-xs capitalize">{getLedgerEntryType(row)}</td>
                    <td className="erp-lg-td text-xs text-slate-700">{entryParticulars(row)}</td>
                    <td className="erp-lg-td erp-lg-td-money erp-lg-debit">
                      {row.debit > 0 ? formatCurrency(row.debit) : "—"}
                    </td>
                    <td className="erp-lg-td erp-lg-td-money erp-lg-credit">
                      {row.credit > 0 ? formatCurrency(row.credit) : "—"}
                    </td>
                    <td className="erp-lg-td erp-lg-td-money font-semibold">{formatCurrency(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="erp-lg-foot">
                  <td className="erp-lg-td" colSpan={showAccountColumn ? 6 : 5}>
                    Totals
                  </td>
                  <td className="erp-lg-td erp-lg-td-money erp-lg-debit font-bold">
                    {formatCurrency(filteredTotals.receipts)}
                  </td>
                  <td className="erp-lg-td erp-lg-td-money erp-lg-credit font-bold">
                    {formatCurrency(filteredTotals.payments)}
                  </td>
                  <td className="erp-lg-td" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </ReportShell>
  );
}

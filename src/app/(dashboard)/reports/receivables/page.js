"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useToast } from "@/context/ToastContext";
import ReportShell from "@/components/reports/ReportShell";
import { useRegisterExport } from "@/hooks/useRegisterExport";
import { Scale, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

const PRINT_COLS = [
  { key: "name", label: "Account", get: (r) => r.name, pdfWidth: 40 },
  { key: "cat", label: "Category", get: (r) => r.category, pdfWidth: 22 },
  { key: "phone", label: "Phone", get: (r) => r.phone || "—", pdfWidth: 24 },
  { key: "bal", label: "Balance", align: "right", get: (r) => formatCurrency(r.balance), pdfWidth: 28, bold: true },
];

export default function ReceivablesReportPage() {
  const { showToast } = useToast();
  const printRef = useRef(null);

  const [tab, setTab] = useState("receivable");
  const [summary, setSummary] = useState({});
  const [receivables, setReceivables] = useState([]);
  const [payables, setPayables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [companySettings, setCompanySettings] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/reports/receivables")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setSummary(d.summary || {});
          setReceivables(d.receivables || []);
          setPayables(d.payables || []);
        } else showToast(d.error || "Failed to load report", "error");
      })
      .catch(() => showToast("Error connecting to server", "error"))
      .finally(() => setLoading(false));
    fetch("/api/settings").then((r) => r.json()).then((d) => { if (d.settings) setCompanySettings(d.settings); }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = tab === "receivable" ? receivables : payables;

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter(
      (a) => a.name?.toLowerCase().includes(q) || a.category?.toLowerCase().includes(q)
    );
  }, [rows, searchQuery]);

  const total = filtered.reduce((s, r) => s + (r.balance || 0), 0);

  const { pdfLoading, onPrint, onExportPdf } = useRegisterExport({
    printRef,
    title: tab === "receivable" ? "Receivables Report" : "Payables Report",
    subtitle: `${filtered.length} accounts`,
    company: companySettings,
    columns: PRINT_COLS,
    rows: filtered,
    footers: [{ label: "Total", value: formatCurrency(total), valueColumn: "bal", labelColumn: "phone" }],
    filename: `${tab}-report.pdf`,
  });

  return (
    <ReportShell
      badge="Finance"
      badgeIcon={Scale}
      title="Receivables & payables"
      description="Outstanding customer dues and vendor balances from the ledger."
      filterBar={
        <div className="erp-reports-filter-bar">
          <button type="button" className={`erp-reports-tab${tab === "receivable" ? " is-active" : ""}`} onClick={() => setTab("receivable")}>
            Receivables ({receivables.length})
          </button>
          <button type="button" className={`erp-reports-tab${tab === "payable" ? " is-active" : ""}`} onClick={() => setTab("payable")}>
            Payables ({payables.length})
          </button>
        </div>
      }
      stats={[
        { label: "Total receivable", value: formatCurrency(summary.totalReceivable || 0), icon: TrendingUp },
        { label: "Total payable", value: formatCurrency(summary.totalPayable || 0), icon: TrendingDown, valueClass: "text-red-600" },
        { label: "Net position", value: formatCurrency(summary.netPosition || 0), icon: Wallet },
        { label: "Accounts shown", value: filtered.length, icon: Scale },
      ]}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search account..."
      registerTitle={tab === "receivable" ? "Customer receivables" : "Vendor payables"}
      registerMeta={`${filtered.length} accounts · Total ${formatCurrency(total)}`}
      onPrint={onPrint}
      onExportPdf={onExportPdf}
      pdfLoading={pdfLoading}
      exportCount={filtered.length}
      loadingOnly={loading && filtered.length === 0}
      printRef={printRef}
      companySettings={companySettings}
      printColumns={PRINT_COLS}
      printRows={filtered}
      printFooters={[{ label: "Total", value: formatCurrency(total), valueColumn: "bal", labelColumn: "phone" }]}
    >
      {loading ? (
        <div className="h-48 flex items-center justify-center text-slate-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-500 py-12 text-center">No {tab === "receivable" ? "receivable" : "payable"} balances found.</p>
      ) : (
        <div className="erp-accounts-grid-wrap">
          <div className="erp-accounts-grid-scroll">
            <table className="erp-ledger-grid erp-reports-grid is-accounts">
              <thead>
                <tr>
                  <th className="erp-lg-th erp-lg-th-num">#</th>
                  <th className="erp-lg-th">Account</th>
                  <th className="erp-lg-th">Category</th>
                  <th className="erp-lg-th">Phone</th>
                  <th className="erp-lg-th erp-lg-th-money">Balance</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, idx) => (
                  <tr key={row.id} className="erp-lg-row">
                    <td className="erp-lg-td erp-lg-td-num text-slate-400">{idx + 1}</td>
                    <td className="erp-lg-td font-semibold text-slate-900">{row.name}</td>
                    <td className="erp-lg-td text-xs capitalize text-slate-600">{row.category}</td>
                    <td className="erp-lg-td text-xs font-mono">{row.phone || "—"}</td>
                    <td className={`erp-lg-td erp-lg-td-money font-bold${tab === "payable" ? " text-red-600" : " text-emerald-700"}`}>
                      {formatCurrency(row.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ReportShell>
  );
}

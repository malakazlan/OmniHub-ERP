"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useToast } from "@/context/ToastContext";
import ReportShell, { ReportDateFilter } from "@/components/reports/ReportShell";
import { useRegisterExport } from "@/hooks/useRegisterExport";
import { Wallet2, Hash, DollarSign, Tags } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

const PRINT_COLS = [
  { key: "no", label: "Expense #", get: (r) => r.expenseNumber, pdfWidth: 26 },
  { key: "title", label: "Title", get: (r) => r.expenseTitle, pdfWidth: 40 },
  { key: "cat", label: "Category", get: (r) => r.category?.name || "—", pdfWidth: 24 },
  { key: "amt", label: "Amount", align: "right", get: (r) => formatCurrency(r.amount), pdfWidth: 26, bold: true },
  { key: "date", label: "Date", get: (r) => formatDate(r.expenseDate), pdfWidth: 22 },
];

export default function ExpensesReportPage() {
  const { showToast } = useToast();
  const printRef = useRef(null);

  const [summary, setSummary] = useState({ count: 0, total: 0 });
  const [expenses, setExpenses] = useState([]);
  const [categorySummary, setCategorySummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [companySettings, setCompanySettings] = useState(null);

  const fetchReport = async (fromVal = from, toVal = to) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromVal) params.set("from", fromVal);
      if (toVal) params.set("to", toVal);
      const res = await fetch(`/api/reports/expenses?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setSummary(data.summary || {});
        setExpenses(data.expenses || []);
        setCategorySummary(data.categorySummary || []);
      } else showToast(data.error || "Failed to load expense report", "error");
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    fetch("/api/settings").then((r) => r.json()).then((d) => { if (d.settings) setCompanySettings(d.settings); }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return expenses;
    return expenses.filter(
      (e) =>
        e.expenseTitle?.toLowerCase().includes(q) ||
        e.expenseNumber?.toLowerCase().includes(q) ||
        e.category?.name?.toLowerCase().includes(q)
    );
  }, [expenses, searchQuery]);

  const filteredTotal = filtered.reduce((s, e) => s + (e.amount || 0), 0);

  const { pdfLoading, onPrint, onExportPdf } = useRegisterExport({
    printRef,
    title: "Expense Report",
    subtitle: `${filtered.length} expenses`,
    company: companySettings,
    columns: PRINT_COLS,
    rows: filtered,
    footers: [{ label: "Total", value: formatCurrency(filteredTotal), valueColumn: "amt", labelColumn: "date" }],
    filename: `expenses-report.pdf`,
  });

  return (
    <ReportShell
      badge="Finance"
      badgeIcon={Wallet2}
      title="Expense report"
      description="Operating expenses grouped by category with date filtering."
      filterBar={
        <ReportDateFilter
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
          onApply={() => fetchReport(from, to)}
          onClear={() => { setFrom(""); setTo(""); fetchReport("", ""); }}
          accentBtnClass="bg-acc-accounts hover:bg-indigo-600"
        />
      }
      stats={[
        { label: "Expenses", value: summary.count, icon: Hash },
        { label: "Total amount", value: formatCurrency(summary.total), icon: DollarSign },
        { label: "Categories", value: categorySummary.length, icon: Tags },
        { label: "Filtered total", value: formatCurrency(filteredTotal), icon: Wallet2 },
      ]}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search title, category..."
      registerTitle="Expense register"
      registerMeta={`${filtered.length} records`}
      onPrint={onPrint}
      onExportPdf={onExportPdf}
      pdfLoading={pdfLoading}
      exportCount={filtered.length}
      loadingOnly={loading && expenses.length === 0}
      printRef={printRef}
      companySettings={companySettings}
      printColumns={PRINT_COLS}
      printRows={filtered}
      printFooters={[{ label: "Total", value: formatCurrency(filteredTotal), valueColumn: "amt", labelColumn: "date" }]}
    >
      {categorySummary.length > 0 && (
        <div className="erp-reports-category-bar">
          {categorySummary.slice(0, 6).map((c) => (
            <div key={c.category} className="erp-reports-category-chip">
              <span>{c.category}</span>
              <strong>{formatCurrency(c.total)}</strong>
              <em>{c.count}</em>
            </div>
          ))}
        </div>
      )}
      {loading ? (
        <div className="h-48 flex items-center justify-center text-slate-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-500 py-12 text-center">No expenses found.</p>
      ) : (
        <div className="erp-accounts-grid-wrap">
          <div className="erp-accounts-grid-scroll">
            <table className="erp-ledger-grid erp-reports-grid is-accounts">
              <thead>
                <tr>
                  <th className="erp-lg-th erp-lg-th-num">#</th>
                  <th className="erp-lg-th">Expense #</th>
                  <th className="erp-lg-th">Title</th>
                  <th className="erp-lg-th">Category</th>
                  <th className="erp-lg-th erp-lg-th-money">Amount</th>
                  <th className="erp-lg-th">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, idx) => (
                  <tr key={row.id} className="erp-lg-row">
                    <td className="erp-lg-td erp-lg-td-num text-slate-400">{idx + 1}</td>
                    <td className="erp-lg-td font-mono text-xs font-semibold text-indigo-700">{row.expenseNumber}</td>
                    <td className="erp-lg-td text-sm text-slate-800">{row.expenseTitle}</td>
                    <td className="erp-lg-td"><span className="erp-fin-cat-pill">{row.category?.name || "—"}</span></td>
                    <td className="erp-lg-td erp-lg-td-money font-bold text-red-600">{formatCurrency(row.amount)}</td>
                    <td className="erp-lg-td erp-lg-td-date">{formatDate(row.expenseDate)}</td>
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

"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useToast } from "@/context/ToastContext";
import ReportShell, { ReportDateFilter } from "@/components/reports/ReportShell";
import { useRegisterExport } from "@/hooks/useRegisterExport";
import { CreditCard, Hash, DollarSign, Wallet } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

const PRINT_COLS = [
  { key: "no", label: "Payment #", get: (r) => r.paymentNumber, pdfWidth: 26 },
  { key: "date", label: "Date", get: (r) => formatDate(r.paymentDate), pdfWidth: 22 },
  { key: "party", label: "Account", get: (r) => r.accountName || "—", pdfWidth: 36 },
  { key: "method", label: "Method", get: (r) => r.paymentMethod, pdfWidth: 20 },
  { key: "amt", label: "Amount", align: "right", get: (r) => formatCurrency(r.amount), pdfWidth: 26, bold: true },
  { key: "desc", label: "Description", get: (r) => r.description || "—", pdfWidth: 40 },
];

export default function PaymentsReportPage() {
  const { showToast } = useToast();
  const printRef = useRef(null);

  const [summary, setSummary] = useState({ count: 0, total: 0 });
  const [payments, setPayments] = useState([]);
  const [methodSummary, setMethodSummary] = useState([]);
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
      const res = await fetch(`/api/reports/payments?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setSummary(data.summary || {});
        setPayments(data.payments || []);
        setMethodSummary(data.methodSummary || []);
      } else showToast(data.error || "Failed to load payment report", "error");
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
    if (!q) return payments;
    return payments.filter(
      (p) =>
        p.paymentNumber?.toLowerCase().includes(q) ||
        p.accountName?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
    );
  }, [payments, searchQuery]);

  const filteredTotal = filtered.reduce((s, p) => s + (p.amount || 0), 0);

  const { pdfLoading, onPrint, onExportPdf } = useRegisterExport({
    printRef,
    title: "Payment Register",
    subtitle: `${filtered.length} payments`,
    company: companySettings,
    columns: PRINT_COLS,
    rows: filtered,
    footers: [{ label: "Total", value: formatCurrency(filteredTotal), valueColumn: "amt", labelColumn: "method" }],
    filename: `payments-report.pdf`,
  });

  return (
    <ReportShell
      badge="Finance"
      badgeIcon={CreditCard}
      title="Payment register"
      description="All approved payments with method breakdown and date filtering."
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
        { label: "Payments", value: summary.count, icon: Hash },
        { label: "Total amount", value: formatCurrency(summary.total), icon: DollarSign },
        { label: "Methods", value: methodSummary.length, icon: CreditCard },
        { label: "Filtered total", value: formatCurrency(filteredTotal), icon: Wallet },
      ]}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search payment #, account..."
      registerTitle="Payment register"
      registerMeta={`${filtered.length} records`}
      onPrint={onPrint}
      onExportPdf={onExportPdf}
      pdfLoading={pdfLoading}
      exportCount={filtered.length}
      loadingOnly={loading && payments.length === 0}
      printRef={printRef}
      companySettings={companySettings}
      printColumns={PRINT_COLS}
      printRows={filtered}
      printFooters={[{ label: "Total", value: formatCurrency(filteredTotal), valueColumn: "amt", labelColumn: "method" }]}
    >
      {methodSummary.length > 0 && (
        <div className="erp-reports-category-bar">
          {methodSummary.map((m) => (
            <div key={m.method} className="erp-reports-category-chip">
              <span className="capitalize">{m.method.replace("_", " ")}</span>
              <strong>{formatCurrency(m.total)}</strong>
              <em>{m.count}</em>
            </div>
          ))}
        </div>
      )}
      {loading ? (
        <div className="h-48 flex items-center justify-center text-slate-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-500 py-12 text-center">No payments found.</p>
      ) : (
        <div className="erp-accounts-grid-wrap">
          <div className="erp-accounts-grid-scroll">
            <table className="erp-ledger-grid erp-reports-grid is-accounts">
              <thead>
                <tr>
                  <th className="erp-lg-th erp-lg-th-num">#</th>
                  <th className="erp-lg-th">Payment #</th>
                  <th className="erp-lg-th">Date</th>
                  <th className="erp-lg-th">Account</th>
                  <th className="erp-lg-th">Method</th>
                  <th className="erp-lg-th erp-lg-th-money">Amount</th>
                  <th className="erp-lg-th">Description</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, idx) => (
                  <tr key={row.id} className="erp-lg-row">
                    <td className="erp-lg-td erp-lg-td-num text-slate-400">{idx + 1}</td>
                    <td className="erp-lg-td font-mono text-xs font-semibold text-indigo-700">{row.paymentNumber}</td>
                    <td className="erp-lg-td erp-lg-td-date">{formatDate(row.paymentDate)}</td>
                    <td className="erp-lg-td text-sm text-slate-800">{row.accountName}</td>
                    <td className="erp-lg-td text-xs capitalize">{row.paymentMethod?.replace("_", " ")}</td>
                    <td className="erp-lg-td erp-lg-td-money font-bold">{formatCurrency(row.amount)}</td>
                    <td className="erp-lg-td text-xs text-slate-600">{row.description || "—"}</td>
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

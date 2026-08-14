"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import ReportShell, { ReportDateFilter } from "@/components/reports/ReportShell";
import TransactionReportRegister from "@/components/reports/TransactionReportRegister";
import { useRegisterExport } from "@/hooks/useRegisterExport";
import { TrendingUp, Hash, DollarSign, Wallet } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

const PRINT_COLS = [
  { key: "inv", label: "Invoice #", get: (r) => r.invoiceNumber || "—", pdfWidth: 24 },
  { key: "date", label: "Date", get: (r) => formatDate(r.saleDate), pdfWidth: 22 },
  { key: "cust", label: "Customer", get: (r) => r.company?.name || r.shop?.name || r.customerName || "—", pdfWidth: 36 },
  { key: "total", label: "Total", align: "right", get: (r) => formatCurrency(r.totalAmount), pdfWidth: 26 },
  { key: "paid", label: "Paid", align: "right", get: (r) => formatCurrency(r.paidAmount), pdfWidth: 24 },
  { key: "due", label: "Due", align: "right", get: (r) => formatCurrency((r.totalAmount || 0) - (r.paidAmount || 0)), pdfWidth: 24 },
  { key: "status", label: "Status", get: (r) => r.status, pdfWidth: 18 },
];

export default function SalesReportPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const printRef = useRef(null);

  const [summary, setSummary] = useState({ count: 0, total: 0, paid: 0, outstanding: 0 });
  const [sales, setSales] = useState([]);
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
      const res = await fetch(`/api/reports/sales/detail?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setSummary(data.summary || {});
        setSales(data.sales || []);
      } else showToast(data.error || "Failed to load sales report", "error");
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
    if (!q) return sales;
    return sales.filter(
      (s) =>
        s.invoiceNumber?.toLowerCase().includes(q) ||
        s.customerName?.toLowerCase().includes(q) ||
        s.company?.name?.toLowerCase().includes(q) ||
        s.shop?.name?.toLowerCase().includes(q)
    );
  }, [sales, searchQuery]);

  const filteredTotal = filtered.reduce((s, r) => s + (r.totalAmount || 0), 0);

  const { pdfLoading, onPrint, onExportPdf } = useRegisterExport({
    printRef,
    title: "Sales Report",
    subtitle: `${filtered.length} invoices · ${from || to ? `${from || "…"} to ${to || "…"}` : "All dates"}`,
    company: companySettings,
    columns: PRINT_COLS,
    rows: filtered,
    footers: [{ label: "Total revenue", value: formatCurrency(filteredTotal), valueColumn: "total", labelColumn: "paid" }],
    filename: `sales-report-${new Date().toISOString().slice(0, 10)}.pdf`,
  });

  return (
    <ReportShell
      badge="Sales"
      badgeIcon={TrendingUp}
      title="Sales report"
      description="Invoice register with revenue, collections, and outstanding balances."
      accentClass="text-acc-sales"
      filterBar={
        <ReportDateFilter
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
          onApply={() => fetchReport(from, to)}
          onClear={() => { setFrom(""); setTo(""); fetchReport("", ""); }}
          accentBtnClass="bg-acc-sales hover:bg-green-600"
        />
      }
      stats={[
        { label: "Invoices", value: summary.count, icon: Hash },
        { label: "Revenue", value: formatCurrency(summary.total), icon: DollarSign },
        { label: "Collected", value: formatCurrency(summary.paid), icon: Wallet },
        { label: "Outstanding", value: formatCurrency(summary.outstanding), icon: Wallet, valueClass: "text-red-600" },
      ]}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search invoice, customer..."
      registerTitle="Sales register"
      registerMeta={`${filtered.length} invoice${filtered.length === 1 ? "" : "s"}`}
      onPrint={onPrint}
      onExportPdf={onExportPdf}
      pdfLoading={pdfLoading}
      exportCount={filtered.length}
      exportLabel="invoices"
      loading={loading && sales.length === 0}
      loadingOnly={loading && sales.length === 0}
      printRef={printRef}
      printTitle="Sales Report"
      printSubtitle={`Total ${formatCurrency(filteredTotal)}`}
      companySettings={companySettings}
      printColumns={PRINT_COLS}
      printRows={filtered}
      printFooters={[{ label: "Total revenue", value: formatCurrency(filteredTotal), valueColumn: "total", labelColumn: "paid" }]}
    >
      <TransactionReportRegister
        rows={filtered}
        loading={loading}
        module="sales"
        numberKey="invoiceNumber"
        numberLabel="Invoice #"
        dateKey="saleDate"
        partyLabel="Customer"
        getPartyName={(r) => r.company?.name || r.shop?.name || r.customerName || "—"}
        onRowClick={(row) => router.push(`/sales/${row.id}`)}
      />
    </ReportShell>
  );
}

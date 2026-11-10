"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import ReportShell, { ReportDateFilter } from "@/components/reports/ReportShell";
import TransactionReportRegister from "@/components/reports/TransactionReportRegister";
import { useRegisterExport } from "@/hooks/useRegisterExport";
import { ShoppingCart, Hash, DollarSign, Wallet } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

const PRINT_COLS = [
  { key: "no", label: "Purchase #", get: (r) => r.purchaseNumber || "—", pdfWidth: 26 },
  { key: "date", label: "Date", get: (r) => formatDate(r.purchaseDate), pdfWidth: 22 },
  { key: "vendor", label: "Vendor", get: (r) => r.farmer?.name || r.company?.name || r.vendorName || "—", pdfWidth: 36 },
  { key: "total", label: "Total", align: "right", get: (r) => formatCurrency(r.totalAmount), pdfWidth: 26 },
  { key: "paid", label: "Paid", align: "right", get: (r) => formatCurrency(r.paidAmount), pdfWidth: 24 },
  { key: "due", label: "Due", align: "right", get: (r) => formatCurrency((r.totalAmount || 0) - (r.paidAmount || 0)), pdfWidth: 24 },
  { key: "status", label: "Status", get: (r) => r.status, pdfWidth: 18 },
];

export default function PurchasesReportPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const printRef = useRef(null);

  const [summary, setSummary] = useState({ count: 0, total: 0, paid: 0, outstanding: 0 });
  const [purchases, setPurchases] = useState([]);
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
      const res = await fetch(`/api/reports/purchases?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setSummary(data.summary || {});
        setPurchases(data.purchases || []);
      } else showToast(data.error || "Failed to load purchases report", "error");
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
    if (!q) return purchases;
    return purchases.filter(
      (p) =>
        p.purchaseNumber?.toLowerCase().includes(q) ||
        p.vendorName?.toLowerCase().includes(q) ||
        p.farmer?.name?.toLowerCase().includes(q) ||
        p.company?.name?.toLowerCase().includes(q)
    );
  }, [purchases, searchQuery]);

  const filteredTotal = filtered.reduce((s, r) => s + (r.totalAmount || 0), 0);

  const { pdfLoading, onPrint, onExportPdf } = useRegisterExport({
    printRef,
    title: "Purchasing Report",
    subtitle: `${filtered.length} purchases`,
    company: companySettings,
    columns: PRINT_COLS,
    rows: filtered,
    footers: [{ label: "Total spend", value: formatCurrency(filteredTotal), valueColumn: "total", labelColumn: "paid" }],
    filename: `purchases-report-${new Date().toISOString().slice(0, 10)}.pdf`,
  });

  return (
    <ReportShell
      badge="Purchases"
      badgeIcon={ShoppingCart}
      title="Purchasing report"
      description="Vendor bills, total spend, payments, and outstanding payables."
      accentClass="text-acc-purchases"
      filterBar={
        <ReportDateFilter
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
          onApply={() => fetchReport(from, to)}
          onClear={() => { setFrom(""); setTo(""); fetchReport("", ""); }}
          accentBtnClass="bg-acc-purchases hover:bg-red-600"
        />
      }
      stats={[
        { label: "Bills", value: summary.count, icon: Hash },
        { label: "Total spend", value: formatCurrency(summary.total), icon: DollarSign },
        { label: "Paid", value: formatCurrency(summary.paid), icon: Wallet },
        { label: "Outstanding", value: formatCurrency(summary.outstanding), icon: Wallet, valueClass: "text-red-600" },
      ]}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search purchase #, vendor..."
      registerTitle="Purchase register"
      registerMeta={`${filtered.length} record${filtered.length === 1 ? "" : "s"}`}
      onPrint={onPrint}
      onExportPdf={onExportPdf}
      pdfLoading={pdfLoading}
      exportCount={filtered.length}
      exportLabel="purchases"
      loadingOnly={loading && purchases.length === 0}
      printRef={printRef}
      printTitle="Purchase Report"
      companySettings={companySettings}
      printColumns={PRINT_COLS}
      printRows={filtered}
      printFooters={[{ label: "Total spend", value: formatCurrency(filteredTotal), valueColumn: "total", labelColumn: "paid" }]}
    >
      <TransactionReportRegister
        rows={filtered}
        loading={loading}
        module="purchases"
        numberKey="purchaseNumber"
        numberLabel="Purchase #"
        dateKey="purchaseDate"
        partyLabel="Vendor"
        getPartyName={(r) => r.farmer?.name || r.company?.name || r.vendorName || "—"}
        onRowClick={(row) => router.push(`/purchases/${row.id}`)}
      />
    </ReportShell>
  );
}

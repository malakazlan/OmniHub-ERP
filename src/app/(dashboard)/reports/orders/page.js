"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import ReportShell, { ReportDateFilter } from "@/components/reports/ReportShell";
import { useRegisterExport } from "@/hooks/useRegisterExport";
import { BarChart3, Hash, DollarSign, Users } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

const PRINT_COLS = [
  { key: "no", label: "Order #", get: (r) => r.orderNumber, pdfWidth: 26 },
  { key: "date", label: "Date", get: (r) => formatDate(r.orderDate), pdfWidth: 22 },
  { key: "cust", label: "Customer", get: (r) => r.customerName || "—", pdfWidth: 36 },
  { key: "total", label: "Total", align: "right", get: (r) => formatCurrency(r.totalAmount), pdfWidth: 26, bold: true },
  { key: "status", label: "Status", get: (r) => r.status, pdfWidth: 20 },
  { key: "sp", label: "Salesperson", get: (r) => r.createdBy?.name || "—", pdfWidth: 28 },
];

export default function OrdersReportPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const printRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({ byStatus: [], bySalesperson: [] });
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [companySettings, setCompanySettings] = useState(null);

  const isAdmin = user?.role === "admin" || user?.role === "manager";

  const fetchReport = async (fromVal = from, toVal = to) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromVal) params.set("from", fromVal);
      if (toVal) params.set("to", toVal);
      const res = await fetch(`/api/reports/orders?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setOrders(data.orders || []);
        setSummary(data.summary || { byStatus: [], bySalesperson: [] });
      } else showToast(data.error || "Failed to load order report", "error");
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchReport();
      fetch("/api/settings").then((r) => r.json()).then((d) => { if (d.settings) setCompanySettings(d.settings); }).catch(() => {});
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.orderNumber?.toLowerCase().includes(q) ||
        o.customerName?.toLowerCase().includes(q) ||
        o.createdBy?.name?.toLowerCase().includes(q)
    );
  }, [orders, searchQuery]);

  const totalAmount = filtered.reduce((s, o) => s + (o.totalAmount || 0), 0);

  const { pdfLoading, onPrint, onExportPdf } = useRegisterExport({
    printRef,
    title: "Sales Order Report",
    subtitle: `${filtered.length} orders`,
    company: companySettings,
    columns: PRINT_COLS,
    rows: filtered,
    footers: [{ label: "Total value", value: formatCurrency(totalAmount), valueColumn: "total", labelColumn: "status" }],
    filename: `orders-report.pdf`,
  });

  if (!isAdmin && !loading) {
    return (
      <div className="erp-reports-surface page-enter p-8 text-center">
        <p className="text-slate-600">Admin access required.</p>
        <Link href="/orders" className="text-[var(--brand)] underline text-sm">Back to orders</Link>
      </div>
    );
  }

  return (
    <ReportShell
      badge="Orders"
      badgeIcon={BarChart3}
      title="Sales order pipeline report"
      description="Sales orders by status and sales rep performance."
      accentClass="text-[var(--brand)]"
      filterBar={
        <ReportDateFilter
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
          onApply={() => fetchReport(from, to)}
          onClear={() => { setFrom(""); setTo(""); fetchReport("", ""); }}
          accentBtnClass="bg-[var(--brand)] hover:bg-[var(--brand-ink)]"
        />
      }
      stats={[
        { label: "Total orders", value: filtered.length, icon: Hash },
        { label: "Pipeline value", value: formatCurrency(totalAmount), icon: DollarSign },
        { label: "Statuses", value: summary.byStatus.length, icon: BarChart3 },
        { label: "Salespeople", value: summary.bySalesperson.length, icon: Users },
      ]}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search order, customer..."
      registerTitle="Order register"
      registerMeta={`${filtered.length} orders`}
      onPrint={onPrint}
      onExportPdf={onExportPdf}
      pdfLoading={pdfLoading}
      exportCount={filtered.length}
      loadingOnly={loading && orders.length === 0}
      printRef={printRef}
      companySettings={companySettings}
      printColumns={PRINT_COLS}
      printRows={filtered}
      printFooters={[{ label: "Total value", value: formatCurrency(totalAmount), valueColumn: "total", labelColumn: "status" }]}
    >
      {(summary.byStatus.length > 0 || summary.bySalesperson.length > 0) && (
        <div className="erp-reports-split-summary">
          <div className="erp-reports-split-panel">
            <h3>By status</h3>
            <ul>
              {summary.byStatus.map((row) => (
                <li key={row.status}>
                  <span className="capitalize">{row.status}</span>
                  <strong>{row.count} · {formatCurrency(row.totalAmount)}</strong>
                </li>
              ))}
            </ul>
          </div>
          <div className="erp-reports-split-panel">
            <h3>By salesperson</h3>
            <ul>
              {summary.bySalesperson.map((row) => (
                <li key={row.userId}>
                  <span>{row.name}</span>
                  <strong>{row.count} · {formatCurrency(row.totalAmount)}</strong>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {loading ? (
        <div className="h-48 flex items-center justify-center text-slate-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-500 py-12 text-center">No orders found.</p>
      ) : (
        <div className="erp-accounts-grid-wrap">
          <div className="erp-accounts-grid-scroll">
            <table className="erp-ledger-grid erp-reports-grid is-orders">
              <thead>
                <tr>
                  <th className="erp-lg-th erp-lg-th-num">#</th>
                  <th className="erp-lg-th">Order #</th>
                  <th className="erp-lg-th">Date</th>
                  <th className="erp-lg-th">Customer</th>
                  <th className="erp-lg-th erp-lg-th-money">Total</th>
                  <th className="erp-lg-th">Status</th>
                  <th className="erp-lg-th">Salesperson</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, idx) => (
                  <tr key={row.id} className="erp-lg-row">
                    <td className="erp-lg-td erp-lg-td-num text-slate-400">{idx + 1}</td>
                    <td className="erp-lg-td font-semibold text-[var(--brand)]">{row.orderNumber}</td>
                    <td className="erp-lg-td erp-lg-td-date">{formatDate(row.orderDate)}</td>
                    <td className="erp-lg-td text-sm">{row.customerName}</td>
                    <td className="erp-lg-td erp-lg-td-money font-bold">{formatCurrency(row.totalAmount)}</td>
                    <td className="erp-lg-td text-xs capitalize">{row.status}</td>
                    <td className="erp-lg-td text-xs text-slate-600">{row.createdBy?.name || "—"}</td>
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

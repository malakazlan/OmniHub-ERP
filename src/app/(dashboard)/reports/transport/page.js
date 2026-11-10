"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import ReportShell, { ReportDateFilter } from "@/components/reports/ReportShell";
import { useRegisterExport } from "@/hooks/useRegisterExport";
import { Truck, Package, DollarSign, Wallet, Car } from "lucide-react";
import { formatCurrency, formatDate, formatQuantity } from "@/lib/formatters";

const STATUS_LABELS = { pending: "Pending", in_transit: "In transit", delivered: "Delivered", cancelled: "Cancelled" };

const TRIP_PRINT_COLS = [
  { key: "no", label: "Transport #", get: (r) => r.transportNumber, pdfWidth: 26 },
  { key: "date", label: "Date", get: (r) => formatDate(r.createdAt), pdfWidth: 22 },
  { key: "route", label: "Route", get: (r) => `${r.originCity || "—"} → ${r.destinationCity || "—"}`, pdfWidth: 36 },
  { key: "vehicle", label: "Vehicle", get: (r) => r.vehicle?.registrationNumber || r.vehicleNumber || "—", pdfWidth: 22 },
  { key: "charges", label: "Charges", align: "right", get: (r) => formatCurrency(r.totalCharges), pdfWidth: 26, bold: true },
  { key: "status", label: "Status", get: (r) => STATUS_LABELS[r.status] || r.status, pdfWidth: 18 },
];

export default function TransportReportPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const printRef = useRef(null);

  const [summary, setSummary] = useState({});
  const [transports, setTransports] = useState([]);
  const [vehicleUtilization, setVehicleUtilization] = useState([]);
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
      const res = await fetch(`/api/reports/transport?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setSummary(data.summary || {});
        setTransports(data.transports || []);
        setVehicleUtilization(data.vehicleUtilization || []);
      } else showToast(data.error || "Failed to load transport report", "error");
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
    if (!q) return transports;
    return transports.filter(
      (t) =>
        t.transportNumber?.toLowerCase().includes(q) ||
        t.originCity?.toLowerCase().includes(q) ||
        t.destinationCity?.toLowerCase().includes(q) ||
        t.vehicle?.registrationNumber?.toLowerCase().includes(q)
    );
  }, [transports, searchQuery]);

  const totalCharges = filtered.reduce((s, t) => s + (t.totalCharges || 0), 0);

  const { pdfLoading, onPrint, onExportPdf } = useRegisterExport({
    printRef,
    title: "Delivery Report",
    subtitle: `${filtered.length} deliveries`,
    company: companySettings,
    columns: TRIP_PRINT_COLS,
    rows: filtered,
    footers: [{ label: "Total charges", value: formatCurrency(totalCharges), valueColumn: "charges", labelColumn: "status" }],
    filename: `transport-report.pdf`,
  });

  return (
    <ReportShell
      badge="Transport"
      badgeIcon={Truck}
      title="Delivery report"
      description="Deliveries, freight charges, and fleet utilization."
      accentClass="text-acc-transport"
      filterBar={
        <ReportDateFilter
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
          onApply={() => fetchReport(from, to)}
          onClear={() => { setFrom(""); setTo(""); fetchReport("", ""); }}
          accentBtnClass="bg-acc-transport hover:bg-cyan-600"
        />
      }
      stats={[
        { label: "Total deliveries", value: summary.count || 0, icon: Package },
        { label: "Total charges", value: formatCurrency(summary.totalCharges || 0), icon: DollarSign },
        { label: "Outstanding", value: formatCurrency(summary.outstanding || 0), icon: Wallet, valueClass: "text-red-600" },
        { label: "Active fleet", value: `${summary.activeVehicles || 0}/${summary.totalVehicles || 0}`, icon: Car },
      ]}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search delivery, route, vehicle..."
      registerTitle="Delivery register"
      registerMeta={`${filtered.length} trips`}
      onPrint={onPrint}
      onExportPdf={onExportPdf}
      pdfLoading={pdfLoading}
      exportCount={filtered.length}
      loadingOnly={loading && transports.length === 0}
      printRef={printRef}
      companySettings={companySettings}
      printColumns={TRIP_PRINT_COLS}
      printRows={filtered}
      printFooters={[{ label: "Total charges", value: formatCurrency(totalCharges), valueColumn: "charges", labelColumn: "status" }]}
    >
      {vehicleUtilization.length > 0 && (
        <div className="erp-reports-category-bar">
          {vehicleUtilization.slice(0, 5).map((v) => (
            <div key={v.registrationNumber} className="erp-reports-category-chip is-transport">
              <span>{v.registrationNumber}</span>
              <strong>{v.trips} deliveries</strong>
              <em>{formatCurrency(v.totalCharges)}</em>
            </div>
          ))}
        </div>
      )}
      {loading ? (
        <div className="h-48 flex items-center justify-center text-slate-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-500 py-12 text-center">No deliveries found for the selected period.</p>
      ) : (
        <div className="erp-accounts-grid-wrap">
          <div className="erp-accounts-grid-scroll">
            <table className="erp-ledger-grid erp-reports-grid is-transport">
              <thead>
                <tr>
                  <th className="erp-lg-th erp-lg-th-num">#</th>
                  <th className="erp-lg-th">Transport #</th>
                  <th className="erp-lg-th">Date</th>
                  <th className="erp-lg-th">Route</th>
                  <th className="erp-lg-th">Vehicle</th>
                  <th className="erp-lg-th erp-lg-th-money">Charges</th>
                  <th className="erp-lg-th">Load</th>
                  <th className="erp-lg-th">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, idx) => (
                  <tr key={row.id} className="erp-lg-row is-clickable" onClick={() => router.push(`/transport/new?id=${row.id}`)}>
                    <td className="erp-lg-td erp-lg-td-num text-slate-400">{idx + 1}</td>
                    <td className="erp-lg-td font-mono text-xs font-semibold text-cyan-700">{row.transportNumber}</td>
                    <td className="erp-lg-td erp-lg-td-date">{formatDate(row.createdAt)}</td>
                    <td className="erp-lg-td text-xs">{row.originCity} → {row.destinationCity}</td>
                    <td className="erp-lg-td font-mono text-xs">{row.vehicle?.registrationNumber || row.vehicleNumber || "—"}</td>
                    <td className="erp-lg-td erp-lg-td-money font-bold">{formatCurrency(row.totalCharges)}</td>
                    <td className="erp-lg-td text-xs">{formatQuantity(row.loadWeight, "lb")}</td>
                    <td className="erp-lg-td">
                      <span className={`erp-reports-status is-${row.status === "cancelled" ? "cancelled" : "ok"}`}>
                        {STATUS_LABELS[row.status] || row.status}
                      </span>
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

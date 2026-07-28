"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { PageHeader, StatCard } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/Button";
import { DataTable } from "@/components/ui/DataTable";
import { Truck, Loader2, ArrowLeft, DollarSign, Wallet, Car, Package } from "lucide-react";
import { formatCurrency, formatQuantity, formatDate } from "@/lib/formatters";

const STATUS_VARIANTS = { pending: "warning", in_transit: "info", delivered: "success", cancelled: "danger" };

export default function TransportReportPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [summary, setSummary] = useState({
    count: 0, totalCharges: 0, totalPaid: 0, outstanding: 0, totalLoadWeight: 0,
    totalVehicles: 0, activeVehicles: 0, vehicleExpenses: 0,
  });
  const [transports, setTransports] = useState([]);
  const [vehicleUtilization, setVehicleUtilization] = useState([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
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

  useEffect(() => { fetchReport(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tripColumns = [
    { header: "Transport #", accessor: "transportNumber", cell: (row) => <span className="font-mono text-xs font-semibold text-acc-transport">{row.transportNumber}</span> },
    { header: "Date", accessor: "createdAt", cell: (row) => <span className="text-xs text-slate-500">{formatDate(row.createdAt)}</span> },
    { header: "Route", accessor: "originCity", cell: (row) => <span className="text-xs text-slate-700">{row.originCity} → {row.destinationCity}</span> },
    { header: "Vehicle", accessor: "vehicleNumber", cell: (row) => <span className="font-mono text-xs text-slate-600">{row.vehicle?.registrationNumber || row.vehicleNumber || "—"}</span> },
    { header: "Charges", accessor: "totalCharges", cell: (row) => <span className="font-mono text-xs font-bold text-slate-900">{formatCurrency(row.totalCharges)}</span> },
    { header: "Status", accessor: "status", cell: (row) => <Badge variant={STATUS_VARIANTS[row.status] || "neutral"} className="capitalize">{row.status?.replace("_", " ")}</Badge> },
  ];

  const utilizationColumns = [
    { header: "Vehicle", accessor: "registrationNumber", cell: (row) => <span className="font-mono text-xs font-semibold text-acc-transport">{row.registrationNumber}</span> },
    { header: "Trips", accessor: "trips", cell: (row) => <span className="font-mono text-xs font-bold text-slate-900">{row.trips}</span> },
    { header: "Load Carried", accessor: "totalLoadWeight", cell: (row) => <span className="text-xs text-slate-600">{formatQuantity(row.totalLoadWeight, "ton")}</span> },
    { header: "Total Charges", accessor: "totalCharges", cell: (row) => <span className="font-mono text-xs font-bold text-slate-900">{formatCurrency(row.totalCharges)}</span> },
  ];

  return (
    <div className="space-y-8 page-enter pb-10">
      <PageHeader
        module="transport"
        title="Transport Report"
        description="Delivery costs, trips, and fleet utilization."
        icon={Truck}
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Transport" }]}
        actions={
          <Link href="/reports"><Button variant="outline" className="border-slate-200 text-slate-600"><ArrowLeft className="w-4 h-4" /> Back</Button></Link>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input-field text-xs" />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input-field text-xs" />
          </div>
          <Button onClick={fetchReport} className="bg-acc-transport hover:bg-cyan-600 border-0">Apply Filter</Button>
          {(from || to) && (
            <button type="button" onClick={() => { setFrom(""); setTo(""); setTimeout(fetchReport, 0); }} className="text-xs text-slate-500 hover:text-slate-800 underline">Clear</button>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard module="transport" label="Total Trips" value={summary.count} icon={Package} />
        <StatCard module="transport" label="Total Charges" value={formatCurrency(summary.totalCharges)} icon={DollarSign} />
        <StatCard module="transport" label="Outstanding" value={formatCurrency(summary.outstanding)} icon={Wallet} valueClassName={summary.outstanding > 0 ? "text-red-500" : ""} />
        <StatCard module="transport" label="Active Fleet" value={`${summary.activeVehicles}/${summary.totalVehicles}`} icon={Car} />
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center"><Loader2 className="w-8 h-8 text-acc-transport animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <Card>
              <CardHeader><h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Truck className="w-4 h-4 text-acc-transport" /> Trips</h2></CardHeader>
              <CardContent>
                {transports.length === 0 ? (
                  <p className="text-sm text-slate-500 py-10 text-center">No trips found for the selected period.</p>
                ) : (
                  <DataTable columns={tripColumns} data={transports} onRowClick={(row) => router.push(`/transport/new?id=${row.id}`)} />
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Car className="w-4 h-4 text-acc-transport" /> Vehicle Utilization</h2></CardHeader>
            <CardContent>
              {vehicleUtilization.length === 0 ? (
                <p className="text-sm text-slate-500 py-10 text-center">No vehicle activity yet.</p>
              ) : (
                <DataTable columns={utilizationColumns} data={vehicleUtilization} />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

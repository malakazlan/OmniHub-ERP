"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { PageHeader, StatCard } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/Button";
import { DataTable } from "@/components/ui/DataTable";
import { TrendingUp, Loader2, ArrowLeft, DollarSign, Wallet, Hash } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

export default function SalesReportPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [summary, setSummary] = useState({ count: 0, total: 0, paid: 0, outstanding: 0 });
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
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

  useEffect(() => { fetchReport(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const columns = [
    { header: "Sale #", accessor: "saleNumber", cell: (row) => <span className="font-mono text-xs font-semibold text-acc-sales">{row.saleNumber}</span> },
    { header: "Date", accessor: "saleDate", cell: (row) => <span className="text-xs text-slate-500">{formatDate(row.saleDate)}</span> },
    { header: "Customer", accessor: "customerName", cell: (row) => <span className="text-sm text-slate-800">{row.company?.name || row.shop?.name || row.customerName || "—"}</span> },
    { header: "Items", accessor: "items", cell: (row) => <span className="text-xs text-slate-500">{(row.items || []).length}</span> },
    { header: "Total", accessor: "totalAmount", cell: (row) => <span className="font-mono text-xs font-bold text-slate-900">{formatCurrency(row.totalAmount)}</span> },
    { header: "Paid", accessor: "paidAmount", cell: (row) => <span className="font-mono text-xs text-emerald-600">{formatCurrency(row.paidAmount)}</span> },
    { header: "Status", accessor: "status", cell: (row) => <Badge variant={row.status === "cancelled" ? "danger" : "success"} className="capitalize">{row.status}</Badge> },
  ];

  return (
    <div className="space-y-8 page-enter pb-10">
      <PageHeader
        module="sales"
        title="Sales Report"
        description="By date, customer, and product performance."
        icon={TrendingUp}
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Sales" }]}
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
          <Button onClick={fetchReport} className="bg-acc-sales hover:bg-green-600 border-0">Apply Filter</Button>
          {(from || to) && (
            <button type="button" onClick={() => { setFrom(""); setTo(""); setTimeout(fetchReport, 0); }} className="text-xs text-slate-500 hover:text-slate-800 underline">Clear</button>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard module="sales" label="Total Sales" value={summary.count} icon={Hash} />
        <StatCard module="sales" label="Revenue" value={formatCurrency(summary.total)} icon={DollarSign} />
        <StatCard module="sales" label="Collected" value={formatCurrency(summary.paid)} icon={Wallet} />
        <StatCard module="sales" label="Outstanding" value={formatCurrency(summary.outstanding)} icon={Wallet} valueClassName="text-red-500" />
      </div>

      <Card>
        <CardContent>
          {loading ? (
            <div className="h-48 flex items-center justify-center"><Loader2 className="w-8 h-8 text-acc-sales animate-spin" /></div>
          ) : sales.length === 0 ? (
            <p className="text-sm text-slate-500 py-10 text-center">No sales found for the selected period.</p>
          ) : (
            <DataTable columns={columns} data={sales} onRowClick={(row) => router.push(`/sales/${row.id}`)} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

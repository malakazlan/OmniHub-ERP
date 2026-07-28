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
import { ShoppingCart, Loader2, ArrowLeft, DollarSign, Wallet, Hash } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

export default function PurchasesReportPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [summary, setSummary] = useState({ count: 0, total: 0, paid: 0, outstanding: 0 });
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
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

  useEffect(() => { fetchReport(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const columns = [
    { header: "Purchase #", accessor: "purchaseNumber", cell: (row) => <span className="font-mono text-xs font-semibold text-acc-purchases">{row.purchaseNumber}</span> },
    { header: "Date", accessor: "purchaseDate", cell: (row) => <span className="text-xs text-slate-500">{formatDate(row.purchaseDate)}</span> },
    { header: "Vendor", accessor: "vendorName", cell: (row) => <span className="text-sm text-slate-800">{row.farmer?.name || row.company?.name || row.vendorName || "—"}</span> },
    { header: "Items", accessor: "items", cell: (row) => <span className="text-xs text-slate-500">{(row.items || []).length}</span> },
    { header: "Total", accessor: "totalAmount", cell: (row) => <span className="font-mono text-xs font-bold text-slate-900">{formatCurrency(row.totalAmount)}</span> },
    { header: "Paid", accessor: "paidAmount", cell: (row) => <span className="font-mono text-xs text-emerald-600">{formatCurrency(row.paidAmount)}</span> },
    { header: "Status", accessor: "status", cell: (row) => <Badge variant={row.status === "cancelled" ? "danger" : "success"} className="capitalize">{row.status}</Badge> },
  ];

  return (
    <div className="space-y-8 page-enter pb-10">
      <PageHeader
        module="purchases"
        title="Purchase Report"
        description="By date, vendor, and product performance."
        icon={ShoppingCart}
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Purchases" }]}
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
          <Button onClick={fetchReport} className="bg-acc-purchases hover:bg-red-600 border-0">Apply Filter</Button>
          {(from || to) && (
            <button type="button" onClick={() => { setFrom(""); setTo(""); setTimeout(fetchReport, 0); }} className="text-xs text-slate-500 hover:text-slate-800 underline">Clear</button>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard module="purchases" label="Total Purchases" value={summary.count} icon={Hash} />
        <StatCard module="purchases" label="Total Spend" value={formatCurrency(summary.total)} icon={DollarSign} />
        <StatCard module="purchases" label="Paid" value={formatCurrency(summary.paid)} icon={Wallet} />
        <StatCard module="purchases" label="Outstanding" value={formatCurrency(summary.outstanding)} icon={Wallet} valueClassName="text-red-500" />
      </div>

      <Card>
        <CardContent>
          {loading ? (
            <div className="h-48 flex items-center justify-center"><Loader2 className="w-8 h-8 text-acc-purchases animate-spin" /></div>
          ) : purchases.length === 0 ? (
            <p className="text-sm text-slate-500 py-10 text-center">No purchases found for the selected period.</p>
          ) : (
            <DataTable columns={columns} data={purchases} onRowClick={(row) => router.push(`/purchases/${row.id}`)} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

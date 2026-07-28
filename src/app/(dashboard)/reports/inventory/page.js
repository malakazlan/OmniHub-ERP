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
import { Package, Loader2, ArrowLeft, AlertTriangle, Boxes, DollarSign } from "lucide-react";
import { formatCurrency, formatQuantity } from "@/lib/formatters";

export default function InventoryReportPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [summary, setSummary] = useState({ count: 0, totalStockValue: 0, lowStockCount: 0 });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch("/api/reports/inventory");
        const data = await res.json();
        if (res.ok) {
          setSummary(data.summary || {});
          setProducts(data.products || []);
        } else showToast(data.error || "Failed to load inventory report", "error");
      } catch {
        showToast("Error connecting to server", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = [
    { header: "Product", accessor: "name", cell: (row) => (
      <div>
        <p className="font-semibold text-slate-900">{row.name}</p>
        <p className="text-[10px] font-mono text-slate-400">{row.sku}</p>
      </div>
    ) },
    { header: "Category", accessor: "category", cell: (row) => <Badge variant="info">{row.category?.name || "—"}</Badge> },
    { header: "Stock", accessor: "currentStock", cell: (row) => (
      <span className={`font-mono text-xs font-bold ${row.isLow ? "text-red-500" : "text-emerald-600"}`}>
        {formatQuantity(row.currentStock, row.unit)}
        {row.isLow && <AlertTriangle className="w-3 h-3 inline ml-1" />}
      </span>
    ) },
    { header: "Min. Stock", accessor: "minimumStock", cell: (row) => <span className="text-xs text-slate-500">{formatQuantity(row.minimumStock, row.unit)}</span> },
    { header: "Cost Price", accessor: "costPrice", cell: (row) => <span className="font-mono text-xs">{formatCurrency(row.costPrice)}</span> },
    { header: "Stock Value", accessor: "stockValue", cell: (row) => <span className="font-mono text-xs font-bold text-slate-900">{formatCurrency(row.stockValue)}</span> },
  ];

  return (
    <div className="space-y-8 page-enter pb-10">
      <PageHeader
        module="products"
        title="Inventory Report"
        description="Stock levels, valuation, and low-stock alerts."
        icon={Package}
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Inventory" }]}
        actions={
          <Link href="/reports"><Button variant="outline" className="border-slate-200 text-slate-600"><ArrowLeft className="w-4 h-4" /> Back</Button></Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard module="products" label="Active Products" value={summary.count} icon={Boxes} />
        <StatCard module="products" label="Total Stock Value" value={formatCurrency(summary.totalStockValue)} icon={DollarSign} />
        <StatCard module="products" label="Low Stock Alerts" value={summary.lowStockCount} icon={AlertTriangle} valueClassName="text-red-500" />
      </div>

      <Card>
        <CardContent>
          {loading ? (
            <div className="h-48 flex items-center justify-center"><Loader2 className="w-8 h-8 text-acc-products animate-spin" /></div>
          ) : products.length === 0 ? (
            <p className="text-sm text-slate-500 py-10 text-center">No products found.</p>
          ) : (
            <DataTable columns={columns} data={products} searchKey="name" placeholder="Search products..." onRowClick={(row) => router.push(`/products/${row.id}`)} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

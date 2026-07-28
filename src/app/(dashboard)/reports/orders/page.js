"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { PageHeader, StatCard } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/Button";
import { BarChart3, Loader2, ArrowLeft } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

export default function OrdersReportPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({ byStatus: [], bySalesperson: [] });

  useEffect(() => {
    fetch("/api/reports/orders")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setOrders(d.orders || []);
          setSummary(d.summary || { byStatus: [], bySalesperson: [] });
        } else showToast(d.error || "Failed", "error");
      })
      .catch(() => showToast("Error loading report", "error"))
      .finally(() => setLoading(false));
  }, [showToast]);

  const isAdmin = user?.role === "admin" || user?.role === "manager";

  if (!isAdmin && !loading) {
    return (
      <div className="p-8 text-center text-slate-600">
        Admin access required.{" "}
        <Link href="/orders" className="text-orange-700 underline">Back to orders</Link>
      </div>
    );
  }

  const columns = [
    { header: "Order", accessor: "orderNumber", cell: (r) => <span className="font-semibold">{r.orderNumber}</span> },
    { header: "Date", accessor: "orderDate", cell: (r) => formatDate(r.orderDate) },
    { header: "Customer", accessor: "customerName" },
    { header: "Total", accessor: "totalAmount", cell: (r) => formatCurrency(r.totalAmount) },
    { header: "Status", accessor: "status", cell: (r) => <span className="capitalize text-xs">{r.status}</span> },
    { header: "Salesperson", accessor: "createdBy", cell: (r) => r.createdBy?.name || "—" },
  ];

  return (
    <div className="space-y-8 page-enter pb-8">
      <PageHeader
        module="reports"
        title="Order report"
        description="Pipeline and performance by salesperson."
        icon={BarChart3}
        breadcrumbs={[
          { label: "Reports", href: "/reports" },
          { label: "Orders" },
        ]}
        actions={
          <Link href="/orders">
            <Button variant="outline"><ArrowLeft className="w-4 h-4" /> Orders</Button>
          </Link>
        }
      />

      {loading ? (
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-orange-600" />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {summary.byStatus.map((row) => (
              <StatCard
                key={row.status}
                module="orders"
                label={row.status}
                value={row.count}
                icon={BarChart3}
              />
            ))}
          </div>
          <Card>
            <CardContent className="pt-4">
              <h3 className="text-sm font-bold text-slate-800 mb-3">By salesperson</h3>
              <ul className="space-y-2 text-sm">
                {summary.bySalesperson.map((row) => (
                  <li key={row.userId} className="flex justify-between border-b border-slate-100 py-2">
                    <span>{row.name}</span>
                    <span className="font-mono text-xs">{row.count} orders · {formatCurrency(row.totalAmount)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <DataTable columns={columns} data={orders} searchKey="orderNumber" />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

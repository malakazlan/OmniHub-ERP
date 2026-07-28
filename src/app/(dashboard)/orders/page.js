"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { mustScopeOrdersToSelf } from "@/lib/ordersNav";
import { useToast } from "@/context/ToastContext";
import { PageHeader, StatCard } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/Button";
import {
  ClipboardList,
  Plus,
  Loader2,
  BarChart3,
  Inbox,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

const STATUS_VARIANT = {
  pending: "warning",
  accepted: "success",
  rejected: "danger",
  converted: "indigo",
};

export default function OrdersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState("current");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === "admin" || user?.role === "manager";

  useEffect(() => {
    if (!authLoading && user && mustScopeOrdersToSelf(user)) {
      router.replace("/orders/my");
    }
  }, [authLoading, user, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders?view=${tab}`);
      const data = await res.json();
      if (res.ok) setOrders(data.orders || []);
      else showToast(data.error || "Failed to load orders", "error");
    } catch {
      showToast("Error loading orders", "error");
    } finally {
      setLoading(false);
    }
  }, [tab, showToast]);

  useEffect(() => {
    if (authLoading || !user || mustScopeOrdersToSelf(user)) return;
    load();
  }, [load, authLoading, user]);

  if (authLoading || (user && mustScopeOrdersToSelf(user))) {
    return (
      <div className="h-48 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const acceptedCount = orders.filter((o) => o.status === "accepted").length;

  const columns = [
    {
      header: "Order",
      accessor: "orderNumber",
      cell: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.orderNumber}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{formatDate(row.orderDate)}</p>
        </div>
      ),
    },
    {
      header: "Customer",
      accessor: "customerName",
      cell: (row) => (
        <span className="text-sm font-medium text-slate-800">
          {row.shop?.name || row.company?.name || row.customerName}
        </span>
      ),
    },
    {
      header: "Total",
      accessor: "totalAmount",
      cell: (row) => (
        <span className="erp-money erp-money-strong text-orange-800">{formatCurrency(row.totalAmount)}</span>
      ),
    },
    {
      header: "Status",
      accessor: "status",
      cell: (row) => (
        <Badge variant={STATUS_VARIANT[row.status] || "neutral"} className="capitalize">
          {row.status}
        </Badge>
      ),
    },
    {
      header: "By",
      accessor: "createdBy",
      cell: (row) => (
        <span className="text-xs font-medium text-slate-600">{row.createdBy?.name || "—"}</span>
      ),
    },
  ];

  return (
    <div className="erp-orders-page space-y-6 page-enter pb-8">
      <PageHeader
        module="orders"
        title="Order queue"
        description="Review salesperson orders — accept, reject, or convert accepted orders to sales."
        icon={ClipboardList}
        actions={
          <div className="flex flex-wrap gap-2">
            {isAdmin && (
              <Link href="/reports/orders">
                <Button variant="outline">
                  <BarChart3 className="w-4 h-4" /> Order report
                </Button>
              </Link>
            )}
            <Link href="/orders/new">
              <Button>
                <Plus className="w-4 h-4" /> New order
              </Button>
            </Link>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2 p-1 rounded-xl bg-slate-100/70 border border-slate-200/50 w-fit max-w-full">
        {[
          { key: "current", label: "Current orders" },
          { key: "history", label: "History" },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`erp-filter-pill px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer min-h-[36px] border transition-colors ${
              tab === key
                ? "erp-filter-pill-active border-transparent"
                : "bg-white border-slate-200/80 text-slate-600 hover:border-orange-200 hover:text-orange-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "current" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard module="orders" label="In queue" value={orders.length} icon={Inbox} />
          <StatCard module="orders" label="Pending review" value={pendingCount} icon={Clock} />
          <StatCard module="orders" label="Ready for sale" value={acceptedCount} icon={CheckCircle2} />
        </div>
      )}

      <div className="erp-list-card">
        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={orders}
              searchKey="orderNumber"
              placeholder="Search orders…"
              onRowClick={(row) => router.push(`/orders/${row.id}`)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

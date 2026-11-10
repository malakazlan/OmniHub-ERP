"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { mustScopeOrdersToSelf } from "@/lib/ordersNav";
import { useToast } from "@/context/ToastContext";
import {
  ClipboardList,
  Plus,
  Loader2,
  RefreshCw,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

const TABS = [
  { id: "active", label: "Active", icon: Clock },
  { id: "pending", label: "Pending", icon: Clock },
  { id: "accepted", label: "Approved", icon: CheckCircle2 },
  { id: "history", label: "History", icon: Sparkles },
];

const STATUS_STYLE = {
  pending: { pill: "sp-status-pending", label: "Awaiting review" },
  accepted: { pill: "sp-status-accepted", label: "Approved" },
  rejected: { pill: "sp-status-rejected", label: "Not approved" },
  converted: { pill: "sp-status-converted", label: "Invoiced" },
};

function OrderCard({ order, onOpen }) {
  const style = STATUS_STYLE[order.status] || STATUS_STYLE.pending;
  const customer = order.shop?.name || order.company?.name || order.customerName;

  return (
    <button
      type="button"
      onClick={() => onOpen(order.id)}
      className="sp-order-card w-full text-left active:scale-[0.99] transition-transform duration-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-600/90">
            {order.orderNumber}
          </p>
          <p className="text-base font-bold text-slate-900 truncate mt-0.5">{customer}</p>
          <p className="text-xs text-slate-500 mt-1">{formatDate(order.orderDate)}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold text-slate-900 tabular-nums">{formatCurrency(order.totalAmount)}</p>
          <span className={`sp-status-pill mt-2 inline-block ${style.pill}`}>{style.label}</span>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100/80">
        <span className="text-[11px] text-slate-400">
          {(order.items?.length || 0)} line{(order.items?.length || 0) === 1 ? "" : "s"}
          {order.status === "converted" && order.saleOrder?.invoiceNumber && (
            <span className="text-emerald-600 font-semibold ml-2">· {order.saleOrder.invoiceNumber}</span>
          )}
        </span>
        <span className="text-xs font-semibold text-orange-600 flex items-center gap-0.5">
          View <ChevronRight className="w-4 h-4" />
        </span>
      </div>
    </button>
  );
}

export default function MyOrdersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState("active");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!authLoading && user && !mustScopeOrdersToSelf(user)) {
      router.replace("/orders");
    }
  }, [authLoading, user, router]);

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      let url = "/api/orders?view=current";
      if (tab === "history") url = "/api/orders?view=history";
      else if (tab === "pending") url = "/api/orders?status=pending";
      else if (tab === "accepted") url = "/api/orders?status=accepted";

      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) setOrders(data.orders || []);
      else showToast(data.error || "Could not load orders", "error");
    } catch {
      showToast("Connection error", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab, showToast]);

  useEffect(() => {
    if (authLoading || !user || !mustScopeOrdersToSelf(user)) return;
    fetchOrders();
  }, [fetchOrders, authLoading, user]);

  const stats = useMemo(() => {
    const pending = orders.filter((o) => o.status === "pending").length;
    const accepted = orders.filter((o) => o.status === "accepted").length;
    return { pending, accepted, total: orders.length };
  }, [orders]);

  const firstName = user?.name?.split(" ")[0] || "there";

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-9 h-9 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-enter max-w-lg mx-auto lg:max-w-2xl">
      <header className="sp-orders-hero">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-orange-100/90">Your workspace</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
              Hi, {firstName}
            </h1>
            <p className="text-sm text-orange-50/85 mt-2 leading-relaxed max-w-[280px]">
              Only your orders appear here. Take new orders on the go — admin reviews them separately.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
            className="sp-icon-btn shrink-0"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-5">
          {[
            { label: "Active", value: stats.total },
            { label: "Pending", value: stats.pending },
            { label: "Approved", value: stats.accepted },
          ].map((s) => (
            <div key={s.label} className="sp-stat-chip">
              <p className="text-lg font-bold text-white tabular-nums">{s.value}</p>
              <p className="text-[10px] uppercase tracking-wide text-orange-100/80 font-semibold">{s.label}</p>
            </div>
          ))}
        </div>
      </header>

      <div className="sp-tab-bar mt-4" role="tablist" aria-label="Order filters">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`sp-tab ${tab === id ? "sp-tab-active" : ""}`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2.25} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3 min-h-[12rem]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            <p className="text-sm text-slate-500">Loading your orders…</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="sp-empty-state">
            <ClipboardList className="w-12 h-12 text-orange-300 mx-auto mb-3" strokeWidth={1.5} />
            <p className="font-semibold text-slate-800">No orders in this tab</p>
            <p className="text-sm text-slate-500 mt-1 px-6">
              Tap the button below to capture a sales order.
            </p>
          </div>
        ) : (
          orders.map((order) => (
            <OrderCard key={order.id} order={order} onOpen={(id) => router.push(`/orders/my/${id}`)} />
          ))
        )}
      </div>

      <div className="sp-fab-wrap">
        <Link href="/orders/my/new" className="sp-fab">
          <Plus className="w-6 h-6" strokeWidth={2.5} />
          <span>New order</span>
        </Link>
      </div>
    </div>
  );
}

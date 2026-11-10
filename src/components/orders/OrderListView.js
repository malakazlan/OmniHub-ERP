"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Plus,
  Search,
  Loader2,
  BarChart3,
  Inbox,
  Clock,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/Button";
import { formatCurrency } from "@/lib/formatters";
import FilterSelect from "@/components/listHub/FilterSelect";
import OrderRegister from "@/components/orders/OrderRegister";
import {
  ORDER_VIEW_FILTERS,
  ORDER_STATUS_FILTERS,
  ORDER_PERIOD_FILTERS,
} from "@/components/orders/orderListConstants";
import { matchesPeriodFilter } from "@/lib/listDateFilters";

function sortOrdersNewestFirst(list) {
  return [...list].sort((a, b) => {
    const da = new Date(a.orderDate).getTime();
    const db = new Date(b.orderDate).getTime();
    if (db !== da) return db - da;
    return (b.id || 0) - (a.id || 0);
  });
}

function matchesViewTab(order, viewTab) {
  if (viewTab === "history") {
    return order.status === "rejected" || order.status === "converted";
  }
  return order.status === "pending" || order.status === "accepted";
}

export default function OrderListView({ orders, loading, isAdmin }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [viewFilter, setViewFilter] = useState("current");
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");

  const sorted = useMemo(() => sortOrdersNewestFirst(orders), [orders]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return sorted.filter((o) => {
      if (!matchesViewTab(o, viewFilter)) return false;
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (!matchesPeriodFilter(o.orderDate, periodFilter)) return false;

      if (q) {
        const customer = o.shop?.name || o.company?.name || o.customerName || "";
        const hay = [o.orderNumber, customer, o.status, o.createdBy?.name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [sorted, search, viewFilter, statusFilter, periodFilter]);

  const queueStats = useMemo(() => {
    const current = sorted.filter((o) => matchesViewTab(o, "current"));
    return {
      inQueue: current.length,
      pending: current.filter((o) => o.status === "pending").length,
      accepted: current.filter((o) => o.status === "accepted").length,
      totalValue: filtered.reduce((s, o) => s + (o.totalAmount || 0), 0),
    };
  }, [sorted, filtered]);

  const hasActiveFilters =
    statusFilter !== "all" || periodFilter !== "all" || Boolean(search.trim());

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPeriodFilter("all");
  };

  const statusOptions =
    viewFilter === "history"
      ? ORDER_STATUS_FILTERS.filter((o) => o.key === "all" || o.key === "rejected" || o.key === "converted")
      : ORDER_STATUS_FILTERS.filter((o) => o.key === "all" || o.key === "pending" || o.key === "accepted");

  return (
    <div className="erp-orders-hub page-enter pb-8">
      <div className="erp-orders-hub-inner space-y-5">
        <header className="erp-orders-hub-header">
          <div>
            <div className="erp-orders-hub-badge">
              <ClipboardList className="w-3.5 h-3.5" />
              Order queue
            </div>
            <h1 className="erp-orders-hub-title">Sales Orders</h1>
            <p className="erp-orders-hub-desc">
              Review sales rep orders — accept, reject, or convert to invoices.
            </p>
          </div>
          <div className="erp-orders-hub-actions">
            {isAdmin && (
              <Link href="/reports/orders">
                <Button variant="outline" className="border-slate-200 text-slate-600">
                  <BarChart3 className="w-4 h-4" /> Order report
                </Button>
              </Link>
            )}
            <Link href="/orders/new">
              <Button className="bg-acc-orders hover:bg-orange-700 border-0 shadow-md shadow-orange-600/15 text-white">
                <Plus className="w-4 h-4" /> New order
              </Button>
            </Link>
          </div>
        </header>

        {viewFilter === "current" && (
          <div className="erp-orders-stats">
            <div className="erp-orders-stat">
              <div className="erp-orders-stat-icon"><Inbox className="w-4 h-4" /></div>
              <div>
                <p className="erp-orders-stat-label">In queue</p>
                <p className="erp-orders-stat-value">{queueStats.inQueue}</p>
              </div>
            </div>
            <div className="erp-orders-stat">
              <div className="erp-orders-stat-icon"><Clock className="w-4 h-4" /></div>
              <div>
                <p className="erp-orders-stat-label">Pending review</p>
                <p className="erp-orders-stat-value">{queueStats.pending}</p>
              </div>
            </div>
            <div className="erp-orders-stat">
              <div className="erp-orders-stat-icon"><CheckCircle2 className="w-4 h-4" /></div>
              <div>
                <p className="erp-orders-stat-label">Ready for sale</p>
                <p className="erp-orders-stat-value">{queueStats.accepted}</p>
              </div>
            </div>
            <div className="erp-orders-stat">
              <div className="erp-orders-stat-icon"><ClipboardList className="w-4 h-4" /></div>
              <div>
                <p className="erp-orders-stat-label">Filtered value</p>
                <p className="erp-orders-stat-value">{formatCurrency(queueStats.totalValue)}</p>
              </div>
            </div>
          </div>
        )}

        <div className="erp-orders-filters-panel">
          <div className="erp-orders-search-wrap">
            <Search className="erp-orders-search-icon" />
            <input
              type="text"
              placeholder="Search order #, customer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="erp-orders-select-row">
            <FilterSelect label="View" value={viewFilter} onChange={(v) => { setViewFilter(v); setStatusFilter("all"); }} options={ORDER_VIEW_FILTERS} classPrefix="erp-orders" />
            <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter} options={statusOptions} classPrefix="erp-orders" />
            <FilterSelect label="Period" value={periodFilter} onChange={setPeriodFilter} options={ORDER_PERIOD_FILTERS} classPrefix="erp-orders" />
            {hasActiveFilters && (
              <button type="button" className="erp-orders-clear-filters" onClick={clearFilters}>
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="erp-orders-register erp-orders-sheet-panel">
          <div className="erp-orders-register-head">
            <div>
              <p className="erp-orders-register-title">Order register</p>
              <p className="erp-orders-register-meta">
                {filtered.length} of {orders.length} rows · newest first
              </p>
            </div>
          </div>

          {loading ? (
            <div className="h-52 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-acc-orders animate-spin" />
            </div>
          ) : (
            <OrderRegister rows={filtered} onOpenOrder={(id) => router.push(`/orders/${id}`)} />
          )}
        </div>
      </div>
    </div>
  );
}

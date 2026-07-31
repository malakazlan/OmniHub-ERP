"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  TrendingUp, ShoppingCart, DollarSign, AlertTriangle, ArrowRight,
  Loader2, Plus, LayoutDashboard, PackageCheck, Wallet,
} from "lucide-react";
import { StatCard } from "@/components/layout/PageHeader";
import { formatCurrency } from "@/lib/formatters";
import DashboardShortcuts from "@/components/dashboard/DashboardShortcuts";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

export default function ExecutiveDashboard() {
  const [stats, setStats] = useState({
    sales: 0, purchases: 0, outstandingReceivables: 0, outstandingPayables: 0, lowStockCount: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  const todayLabel = useMemo(
    () => new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    []
  );

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/reports/sales");
        if (res.ok) {
          const data = await res.json();
          if (data.summary) setStats(data.summary);
          if (data.trend) setChartData(data.trend);
        }
      } catch {
        /* keep zeros */
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="erp-dashboard h-72 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--brand-primary)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="erp-dashboard space-y-5 sm:space-y-6 page-enter">
      {/* Hero */}
      <header className="erp-dash-hero">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="erp-dash-hero-icon">
              <LayoutDashboard className="w-6 h-6" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--brand-primary)] mb-1">{todayLabel}</p>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">Dashboard</h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-xl">
                Live overview of Warraich Traders trading operations, receivables, and inventory health.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <Link href="/sales/new" className="erp-dash-btn erp-dash-btn-primary">
              <Plus className="w-4 h-4 shrink-0" /> New Sale
            </Link>
            <Link href="/purchases/new" className="erp-dash-btn erp-dash-btn-secondary">
              <Plus className="w-4 h-4 shrink-0" /> New Purchase
            </Link>
          </div>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatCard module="sales" label="Total Sales" value={formatCurrency(stats.sales)} icon={TrendingUp} className="erp-dash-stat" />
        <StatCard module="purchases" label="Total Purchases" value={formatCurrency(stats.purchases)} icon={ShoppingCart} className="erp-dash-stat" />
        <StatCard module="shops" label="Receivables" value={formatCurrency(stats.outstandingReceivables)} icon={Wallet} className="erp-dash-stat" subtext="Outstanding from customers" />
        <StatCard module="farmers" label="Payables" value={formatCurrency(stats.outstandingPayables)} icon={DollarSign} className="erp-dash-stat" subtext="Due to suppliers" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-5">
        {/* Shortcuts — main column (where chart was) */}
        <div className="xl:col-span-8 min-w-0">
          <DashboardShortcuts />
        </div>

        {/* Side panels */}
        <div className="xl:col-span-4 space-y-4 min-w-0">
          <section className="erp-dash-panel">
            <div className="erp-dash-panel-head">
              <h2 className="erp-dash-panel-title flex items-center gap-2">
                <span className="erp-dash-alert-icon">
                  <AlertTriangle className="w-4 h-4" />
                </span>
                Stock Alerts
              </h2>
              {stats.lowStockCount > 0 && (
                <span className="erp-dash-badge-warn">{stats.lowStockCount} low</span>
              )}
            </div>
            <div className="erp-dash-panel-body space-y-3">
              <div className="flex items-start gap-3">
                <span className={`erp-dash-status-dot ${stats.lowStockCount > 0 ? "erp-dash-status-dot-warn" : "erp-dash-status-dot-ok"}`} />
                <p className="text-sm text-slate-600 leading-relaxed">
                  {stats.lowStockCount > 0
                    ? `${stats.lowStockCount} product(s) are below minimum stock levels. Review inventory before new sales.`
                    : "All products are above minimum thresholds. Inventory is healthy."}
                </p>
              </div>
              <Link href="/products" className="erp-dash-link inline-flex items-center gap-1.5">
                <PackageCheck className="w-3.5 h-3.5" />
                Manage inventory
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </section>

          <section className="erp-dash-panel">
            <div className="erp-dash-panel-head">
              <div>
                <h2 className="erp-dash-panel-title">Finance snapshot</h2>
                <p className="erp-dash-panel-sub">Quick ledger access</p>
              </div>
            </div>
            <div className="erp-dash-panel-body space-y-2">
              {[
                { href: "/accounts/ledger", label: "General Ledger", desc: "Pay & receive" },
                { href: "/accounts/payments", label: "Payments", desc: "Cash & bank transfers" },
                { href: "/accounts", label: "All Accounts", desc: "Parties & registers" },
              ].map((link) => (
                <Link key={link.href} href={link.href} className="erp-dash-mini-link">
                  <span>
                    <span className="block text-sm font-semibold text-slate-800">{link.label}</span>
                    <span className="block text-[11px] text-slate-400">{link.desc}</span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Trading Activity — full width below shortcuts */}
      <section className="erp-dash-panel min-w-0">
        <div className="erp-dash-panel-head">
          <div>
            <h2 className="erp-dash-panel-title">Trading Activity</h2>
            <p className="erp-dash-panel-sub">Sales vs purchases · current week</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-green-600">
              <span className="w-2 h-2 rounded-full bg-green-500 ring-2 ring-green-100" /> Sales
            </span>
            <span className="flex items-center gap-1.5 text-blue-600">
              <span className="w-2 h-2 rounded-full bg-blue-500 ring-2 ring-blue-100" /> Purchases
            </span>
          </div>
        </div>
        <div className="erp-dash-panel-body pt-2">
          <div className="h-52 sm:h-64 lg:h-80 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashColorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="dashColorPurchases" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf3" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1.5px solid #e2e8f0",
                    borderRadius: "12px",
                    color: "#0f172a",
                    boxShadow: "0 12px 32px rgba(15,23,42,0.08)",
                    fontSize: "12px",
                  }}
                />
                <Area type="monotone" dataKey="Sales" stroke="#16a34a" fill="url(#dashColorSales)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="Purchases" stroke="#2563eb" fill="url(#dashColorPurchases)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}

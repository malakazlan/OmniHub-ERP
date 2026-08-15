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
import TradingActivityPanel from "@/components/dashboard/TradingActivityPanel";
import CashBankFlowPanel from "@/components/dashboard/CashBankFlowPanel";
import ReceivablesPayablesPanel from "@/components/dashboard/ReceivablesPayablesPanel";
import LiquidBalancesPanel from "@/components/dashboard/LiquidBalancesPanel";
import ExpensesWeekPanel from "@/components/dashboard/ExpensesWeekPanel";

export default function ExecutiveDashboard() {
  const [stats, setStats] = useState({
    sales: 0, purchases: 0, outstandingReceivables: 0, outstandingPayables: 0, lowStockCount: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [analytics, setAnalytics] = useState({
    cashFlow: { trend: [], balances: { cash: 0, bank: 0, total: 0 }, summary: {} },
    receivables: { total: 0, breakdown: [] },
    payables: { total: 0, breakdown: [] },
    expenses: { trend: [], categories: [], total: 0 },
  });
  const [loading, setLoading] = useState(true);

  const todayLabel = useMemo(
    () => new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    []
  );

  useEffect(() => {
    async function fetchStats() {
      try {
        const [salesRes, analyticsRes] = await Promise.all([
          fetch("/api/reports/sales"),
          fetch("/api/dashboard/analytics"),
        ]);
        if (salesRes.ok) {
          const data = await salesRes.json();
          if (data.summary) setStats(data.summary);
          if (data.trend) setChartData(data.trend);
        }
        if (analyticsRes.ok) {
          const data = await analyticsRes.json();
          setAnalytics({
            cashFlow: data.cashFlow || { trend: [], balances: { cash: 0, bank: 0, total: 0 }, summary: {} },
            receivables: data.receivables || { total: 0, breakdown: [] },
            payables: data.payables || { total: 0, breakdown: [] },
            expenses: data.expenses || { trend: [], categories: [], total: 0 },
          });
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

      {/* Trading activity + finance charts */}
      <div className="space-y-4 min-w-0">
        <TradingActivityPanel chartData={chartData} />
        <CashBankFlowPanel cashFlow={analytics.cashFlow} />

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 min-w-0">
          <ReceivablesPayablesPanel
            receivables={analytics.receivables}
            payables={analytics.payables}
          />
          <LiquidBalancesPanel balances={analytics.cashFlow.balances} />
          <ExpensesWeekPanel expenses={analytics.expenses} />
        </div>
      </div>
    </div>
  );
}

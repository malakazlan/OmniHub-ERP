"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  TrendingUp, ShoppingCart, DollarSign, AlertTriangle, ArrowRight,
  Loader2, Plus, PackageCheck, Wallet, Download,
} from "lucide-react";
import useAuth from "@/hooks/useAuth";
import { StatCard } from "@/components/layout/PageHeader";
import { formatCurrency } from "@/lib/formatters";
import DashboardShortcuts from "@/components/dashboard/DashboardShortcuts";
import TradingActivityPanel from "@/components/dashboard/TradingActivityPanel";
import CashBankFlowPanel from "@/components/dashboard/CashBankFlowPanel";
import ReceivablesPayablesPanel from "@/components/dashboard/ReceivablesPayablesPanel";
import LiquidBalancesPanel from "@/components/dashboard/LiquidBalancesPanel";
import ExpensesWeekPanel from "@/components/dashboard/ExpensesWeekPanel";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function ExecutiveDashboard() {
  const { user } = useAuth();
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
  const firstName = useMemo(() => String(user?.name || "").trim().split(/\s+/)[0] || "", [user?.name]);

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

  const salesSpark = useMemo(() => chartData.map((r) => r.Sales || 0), [chartData]);
  const purchaseSpark = useMemo(() => chartData.map((r) => r.Purchases || 0), [chartData]);
  const cashSpark = useMemo(
    () => (analytics.cashFlow.trend || []).map((r) => (r.totalIn || 0) - (r.totalOut || 0)),
    [analytics.cashFlow.trend]
  );

  if (loading) {
    return (
      <div className="erp-dashboard h-72 flex items-center justify-center">
        <Loader2 className="w-7 h-7 text-[var(--brand)] animate-spin" />
      </div>
    );
  }

  const liquid = analytics.cashFlow.balances?.total ?? 0;
  const net = analytics.cashFlow.summary?.net ?? 0;

  return (
    <div className="erp-dashboard space-y-4 page-enter">
      {/* Page header */}
      <div className="oh-ph">
        <div className="min-w-0">
          <h1 className="oh-ph-title">{firstName ? `${greeting()}, ${firstName}` : "Dashboard"}</h1>
          <p className="oh-ph-sub">{todayLabel} · Live overview of operations, receivables and inventory health</p>
        </div>
        <div className="oh-ph-actions">
          <Link href="/reports" className="erp-dash-btn erp-dash-btn-secondary">
            <Download className="w-3.5 h-3.5 shrink-0" strokeWidth={2} /> Reports
          </Link>
          <Link href="/purchases/new" className="erp-dash-btn erp-dash-btn-secondary">
            <Plus className="w-3.5 h-3.5 shrink-0" strokeWidth={2} /> New purchase
          </Link>
          <Link href="/sales/new" className="erp-dash-btn erp-dash-btn-primary">
            <Plus className="w-3.5 h-3.5 shrink-0" strokeWidth={2} /> New sale
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="oh-kpis">
        <StatCard tone="navy" label="Total sales" value={formatCurrency(stats.sales)} icon={TrendingUp} spark={salesSpark} subtext="All recorded sales" />
        <StatCard tone="blue" label="Total purchases" value={formatCurrency(stats.purchases)} icon={ShoppingCart} spark={purchaseSpark} subtext="All recorded purchases" />
        <StatCard tone="cyan" label="Receivables" value={formatCurrency(stats.outstandingReceivables)} icon={Wallet} subtext="Outstanding from customers" />
        <StatCard
          tone="plain"
          label="Payables"
          value={formatCurrency(stats.outstandingPayables)}
          icon={DollarSign}
          spark={cashSpark}
          subtext={
            <>
              Due to suppliers · cash &amp; bank <b className="num" style={{ color: net >= 0 ? "var(--ok)" : "var(--bad)" }}>{formatCurrency(liquid)}</b>
            </>
          }
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-8 min-w-0">
          <DashboardShortcuts />
        </div>

        <div className="xl:col-span-4 space-y-4 min-w-0">
          <section className="erp-dash-panel">
            <div className="erp-dash-panel-head">
              <h2 className="erp-dash-panel-title flex items-center gap-2">
                <span className="erp-dash-alert-icon">
                  <AlertTriangle className="w-4 h-4" strokeWidth={1.9} />
                </span>
                Stock alerts
              </h2>
              {stats.lowStockCount > 0 && (
                <span className="erp-dash-badge-warn">{stats.lowStockCount} low</span>
              )}
            </div>
            <div className="erp-dash-panel-body space-y-3">
              <div className="flex items-start gap-3">
                <span className={`erp-dash-status-dot ${stats.lowStockCount > 0 ? "erp-dash-status-dot-warn" : "erp-dash-status-dot-ok"}`} />
                <p className="text-[13px] text-[var(--ink-2)] leading-relaxed">
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
                { href: "/accounts/ledger", label: "General ledger", desc: "Pay & receive" },
                { href: "/accounts/payments", label: "Payments", desc: "Cash & bank transfers" },
                { href: "/accounts", label: "All accounts", desc: "Parties & registers" },
              ].map((link) => (
                <Link key={link.href} href={link.href} className="erp-dash-mini-link">
                  <span>
                    <span className="block text-[13px] font-medium text-[var(--ink)]">{link.label}</span>
                    <span className="block text-[11.5px] text-[var(--ink-3)]">{link.desc}</span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-[var(--ink-3)] shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>

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

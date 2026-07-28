"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp, ShoppingCart, DollarSign, AlertTriangle, ArrowRight,
  Sprout, Building2, Store, Truck, Package, Loader2, Plus,
} from "lucide-react";
import { PageHeader, StatCard } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/formatters";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

export default function ExecutiveDashboard() {
  const [stats, setStats] = useState({
    sales: 0, purchases: 0, outstandingReceivables: 0, outstandingPayables: 0, lowStockCount: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

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
      <div className="h-72 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-acc-dashboard animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-8 page-enter">
      <PageHeader
        module="dashboard"
        title="Dashboard"
        description="Live overview of Metro Feeds trading operations."
        icon={TrendingUp}
        actions={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Link href="/sales/new" className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-acc-sales text-white hover:bg-green-600 shadow-md shadow-green-600/15 transition-colors">
              <Plus className="w-4 h-4 shrink-0" /> New Sale
            </Link>
            <Link href="/purchases/new" className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors">
              <Plus className="w-4 h-4 shrink-0" /> New Purchase
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard module="sales" label="Total Sales" value={formatCurrency(stats.sales)} icon={TrendingUp} />
        <StatCard module="purchases" label="Total Purchases" value={formatCurrency(stats.purchases)} icon={ShoppingCart} />
        <StatCard module="shops" label="Receivables" value={formatCurrency(stats.outstandingReceivables)} icon={DollarSign} />
        <StatCard module="farmers" label="Payables" value={formatCurrency(stats.outstandingPayables)} icon={DollarSign} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        <Card hover className="lg:col-span-8 min-w-0">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-5">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">Trading Activity</h2>
                <p className="text-[11px] sm:text-xs text-slate-400">Sales vs Purchases · current week</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-acc-sales">
                  <span className="w-2 h-2 rounded-full bg-acc-sales" /> Sales
                </span>
                <span className="flex items-center gap-1.5 text-acc-purchases">
                  <span className="w-2 h-2 rounded-full bg-acc-purchases" /> Purchases
                </span>
              </div>
            </div>
            <div className="h-52 sm:h-64 lg:h-72 w-full min-w-0 -mx-1 sm:mx-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#dc2626" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      color: "#0f172a",
                      boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
                    }}
                  />
                  <Area type="monotone" dataKey="Sales" stroke="#16a34a" fill="url(#colorSales)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Purchases" stroke="#dc2626" fill="url(#colorPurchases)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-4 space-y-3 sm:space-y-4 min-w-0">
          <Card hover>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Stock Alerts
                </h2>
                {stats.lowStockCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-100">
                    {stats.lowStockCount}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {stats.lowStockCount > 0
                  ? `${stats.lowStockCount} product(s) below minimum stock.`
                  : "All products are above minimum thresholds."}
              </p>
              <Link href="/products" className="text-xs text-acc-products font-bold hover:underline flex items-center gap-1">
                Manage Inventory <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </CardContent>
          </Card>

          <Card hover>
            <CardContent className="p-4 sm:p-6 space-y-3">
              <h2 className="text-sm font-bold text-slate-900">Quick Access</h2>
              <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-2 text-xs font-semibold">
                {[
                  { href: "/farmers", icon: Sprout, label: "Farmers", c: "text-acc-farmers hover:border-acc-farmers" },
                  { href: "/companies", icon: Building2, label: "Companies", c: "text-acc-companies hover:border-acc-companies" },
                  { href: "/shops", icon: Store, label: "Shops", c: "text-acc-shops hover:border-acc-shops" },
                  { href: "/transport", icon: Truck, label: "Transport", c: "text-acc-transport hover:border-acc-transport" },
                  { href: "/products", icon: Package, label: "Products", c: "text-acc-products hover:border-acc-products" },
                  { href: "/accounts", icon: DollarSign, label: "Accounts", c: "text-acc-accounts hover:border-acc-accounts" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 p-2.5 sm:p-3 bg-slate-50 border border-slate-100 hover:bg-white rounded-xl transition-all ${item.c}`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-slate-700">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

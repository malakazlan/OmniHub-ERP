"use client";

import React, { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/formatters";
import { TrendingUp, ShoppingCart } from "lucide-react";
import DashboardChartTooltip from "@/components/dashboard/DashboardChartTooltip";

export default function TradingActivityPanel({ chartData = [] }) {
  const totals = useMemo(() => {
    return chartData.reduce(
      (acc, row) => ({
        sales: acc.sales + (row.Sales || 0),
        purchases: acc.purchases + (row.Purchases || 0),
      }),
      { sales: 0, purchases: 0 }
    );
  }, [chartData]);

  const yMax = useMemo(() => {
    let max = 0;
    for (const row of chartData) {
      max = Math.max(max, row.Sales || 0, row.Purchases || 0);
    }
    return max > 0 ? Math.ceil(max * 1.15) : 1000;
  }, [chartData]);

  return (
    <section className="erp-dash-trading-panel min-w-0">
      <div className="erp-dash-trading-head">
        <div>
          <h2 className="erp-dash-trading-title">Sales vs. purchases</h2>
          <p className="erp-dash-trading-sub">Daily, last 7 days</p>
        </div>
        <div className="erp-dash-trading-kpis">
          <div className="erp-dash-trading-kpi is-sales">
            <TrendingUp className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            <div>
              <p className="erp-dash-trading-kpi-label">Sales</p>
              <p className="erp-dash-trading-kpi-value num">{formatCurrency(totals.sales)}</p>
            </div>
          </div>
          <div className="erp-dash-trading-kpi is-purchases">
            <ShoppingCart className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            <div>
              <p className="erp-dash-trading-kpi-label">Purchases</p>
              <p className="erp-dash-trading-kpi-value num">{formatCurrency(totals.purchases)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="erp-dash-trading-chart-wrap">
        <div className="erp-dash-trading-legend">
          <span className="erp-dash-trading-legend-item is-sales">
            <span className="dot" /> Sales
          </span>
          <span className="erp-dash-trading-legend-item is-purchases">
            <span className="dot" /> Purchases
          </span>
        </div>
        <div className="h-56 sm:h-64 lg:h-72 w-full min-w-0 font-mono">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 4 }} barGap={3} barCategoryGap="28%">
              <CartesianGrid strokeDasharray="2 3" vertical={false} stroke="var(--line)" />
              <XAxis
                dataKey="day"
                stroke="var(--ink-3)"
                tick={{ fill: "var(--ink-3)", fontSize: 10.5 }}
                tickLine={false}
                axisLine={false}
                dy={8}
              />
              <YAxis
                stroke="var(--ink-3)"
                tick={{ fill: "var(--ink-3)", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={52}
                domain={[0, yMax]}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
              />
              <Tooltip content={<DashboardChartTooltip />} cursor={{ fill: "var(--surface-2)" }} />
              <Bar dataKey="Sales" name="Sales" fill="var(--brand)" radius={[3, 3, 0, 0]} maxBarSize={22} />
              <Bar dataKey="Purchases" name="Purchases" fill="var(--cyan)" radius={[3, 3, 0, 0]} maxBarSize={22} opacity={0.9} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

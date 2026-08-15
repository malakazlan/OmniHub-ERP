"use client";

import React, { useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/formatters";
import { TrendingUp, ShoppingCart } from "lucide-react";

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="erp-dash-chart-tooltip">
      <p className="erp-dash-chart-tooltip-day">{label}</p>
      {payload.map((item) => (
        <div key={item.dataKey} className="erp-dash-chart-tooltip-row">
          <span className="erp-dash-chart-tooltip-dot" style={{ background: item.color }} />
          <span>{item.name}</span>
          <span className="font-mono font-bold">{formatCurrency(item.value || 0)}</span>
        </div>
      ))}
    </div>
  );
}

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
          <p className="erp-dash-trading-badge">Weekly performance</p>
          <h2 className="erp-dash-trading-title">Trading activity</h2>
          <p className="erp-dash-trading-sub">Sales vs purchases · last 7 days</p>
        </div>
        <div className="erp-dash-trading-kpis">
          <div className="erp-dash-trading-kpi is-sales">
            <TrendingUp className="w-4 h-4 shrink-0" />
            <div>
              <p className="erp-dash-trading-kpi-label">Sales</p>
              <p className="erp-dash-trading-kpi-value">{formatCurrency(totals.sales)}</p>
            </div>
          </div>
          <div className="erp-dash-trading-kpi is-purchases">
            <ShoppingCart className="w-4 h-4 shrink-0" />
            <div>
              <p className="erp-dash-trading-kpi-label">Purchases</p>
              <p className="erp-dash-trading-kpi-value">{formatCurrency(totals.purchases)}</p>
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
        <div className="h-56 sm:h-64 lg:h-72 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="dashSalesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16a34a" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#16a34a" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="dashPurchGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="day"
                stroke="#94a3b8"
                fontSize={11}
                fontWeight={600}
                tickLine={false}
                axisLine={false}
                dy={8}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={52}
                domain={[0, yMax]}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="Sales"
                name="Sales"
                stroke="#16a34a"
                fill="url(#dashSalesGrad)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#16a34a", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#16a34a", stroke: "#fff", strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="Purchases"
                name="Purchases"
                stroke="#2563eb"
                fill="url(#dashPurchGrad)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#2563eb", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#2563eb", stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

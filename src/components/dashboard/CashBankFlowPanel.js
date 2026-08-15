"use client";

import React, { useMemo } from "react";
import {
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart,
} from "recharts";
import { ArrowDownLeft, ArrowUpRight, Landmark, Wallet, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import DashboardChartTooltip from "@/components/dashboard/DashboardChartTooltip";

function CashFlowTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  const items = [
    { name: "Cash in", value: row.cashIn, color: "#16a34a" },
    { name: "Cash out", value: row.cashOut, color: "#f87171" },
    { name: "Bank in", value: row.bankIn, color: "#2563eb" },
    { name: "Bank out", value: row.bankOut, color: "#fb923c" },
    { name: "Net flow", value: row.net, color: "#0f172a" },
  ];

  return (
    <div className="erp-dash-chart-tooltip">
      <p className="erp-dash-chart-tooltip-day">{label}</p>
      {items.map((item) => (
        <div key={item.name} className="erp-dash-chart-tooltip-row">
          <span className="erp-dash-chart-tooltip-dot" style={{ background: item.color }} />
          <span>{item.name}</span>
          <span className="font-mono font-bold">{formatCurrency(item.value || 0)}</span>
        </div>
      ))}
    </div>
  );
}

export default function CashBankFlowPanel({ cashFlow = {} }) {
  const trend = cashFlow.trend || [];
  const balances = cashFlow.balances || { cash: 0, bank: 0, total: 0 };
  const summary = cashFlow.summary || {};

  const yMax = useMemo(() => {
    let max = 0;
    for (const row of trend) {
      max = Math.max(max, row.totalIn || 0, row.totalOut || 0);
    }
    return max > 0 ? Math.ceil(max * 1.15) : 1000;
  }, [trend]);

  return (
    <section className="erp-dash-trading-panel erp-dash-cash-panel min-w-0">
      <div className="erp-dash-trading-head">
        <div>
          <p className="erp-dash-trading-badge">Cash & bank</p>
          <h2 className="erp-dash-trading-title">Money flow</h2>
          <p className="erp-dash-trading-sub">Cash and bank in vs out · last 7 days</p>
        </div>
        <div className="erp-dash-trading-kpis">
          <div className="erp-dash-trading-kpi is-cash-balance">
            <Wallet className="w-4 h-4 shrink-0" />
            <div>
              <p className="erp-dash-trading-kpi-label">Cash on hand</p>
              <p className="erp-dash-trading-kpi-value">{formatCurrency(balances.cash)}</p>
            </div>
          </div>
          <div className="erp-dash-trading-kpi is-bank-balance">
            <Landmark className="w-4 h-4 shrink-0" />
            <div>
              <p className="erp-dash-trading-kpi-label">Bank balance</p>
              <p className="erp-dash-trading-kpi-value">{formatCurrency(balances.bank)}</p>
            </div>
          </div>
          <div className="erp-dash-trading-kpi is-money-in">
            <ArrowDownLeft className="w-4 h-4 shrink-0" />
            <div>
              <p className="erp-dash-trading-kpi-label">Money in</p>
              <p className="erp-dash-trading-kpi-value">{formatCurrency(summary.totalIn || 0)}</p>
            </div>
          </div>
          <div className="erp-dash-trading-kpi is-money-out">
            <ArrowUpRight className="w-4 h-4 shrink-0" />
            <div>
              <p className="erp-dash-trading-kpi-label">Money out</p>
              <p className="erp-dash-trading-kpi-value">{formatCurrency(summary.totalOut || 0)}</p>
            </div>
          </div>
          <div className={`erp-dash-trading-kpi ${(summary.net || 0) >= 0 ? "is-net-positive" : "is-net-negative"}`}>
            <TrendingUp className="w-4 h-4 shrink-0" />
            <div>
              <p className="erp-dash-trading-kpi-label">Net flow</p>
              <p className="erp-dash-trading-kpi-value">{formatCurrency(summary.net || 0)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="erp-dash-trading-chart-wrap">
        <div className="erp-dash-trading-legend">
          <span className="erp-dash-trading-legend-item is-money-in">
            <span className="dot" /> Money in
          </span>
          <span className="erp-dash-trading-legend-item is-money-out">
            <span className="dot" /> Money out
          </span>
          <span className="erp-dash-trading-legend-item is-net-line">
            <span className="dot" /> Net flow
          </span>
        </div>
        <div className="h-56 sm:h-64 lg:h-72 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <ComposedChart data={trend} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
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
              <Tooltip content={<CashFlowTooltip />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
              <Bar dataKey="totalIn" name="Money in" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="totalOut" name="Money out" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Line
                type="monotone"
                dataKey="net"
                name="Net flow"
                stroke="#0f172a"
                strokeWidth={2}
                dot={{ r: 3, fill: "#0f172a", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#0f172a", stroke: "#fff", strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

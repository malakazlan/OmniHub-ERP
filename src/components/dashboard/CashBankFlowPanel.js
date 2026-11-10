"use client";

import React, { useMemo } from "react";
import {
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart,
} from "recharts";
import { ArrowDownLeft, ArrowUpRight, Landmark, Wallet, TrendingUp } from "lucide-react";
import { formatCurrency, formatAxisMoney } from "@/lib/formatters";

function CashFlowTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  const items = [
    { name: "Cash in", value: row.cashIn, color: "var(--ok)" },
    { name: "Cash out", value: row.cashOut, color: "var(--bad)" },
    { name: "Bank in", value: row.bankIn, color: "var(--brand)" },
    { name: "Bank out", value: row.bankOut, color: "var(--warn)" },
    { name: "Net flow", value: row.net, color: "var(--ink)" },
  ];

  return (
    <div className="erp-dash-chart-tooltip">
      <p className="erp-dash-chart-tooltip-day">{label}</p>
      {items.map((item) => (
        <div key={item.name} className="erp-dash-chart-tooltip-row">
          <span className="erp-dash-chart-tooltip-dot" style={{ background: item.color }} />
          <span>{item.name}</span>
          <span className="num font-semibold">{formatCurrency(item.value || 0)}</span>
        </div>
      ))}
    </div>
  );
}

export default function CashBankFlowPanel({ cashFlow = {} }) {
  const trend = useMemo(() => cashFlow.trend || [], [cashFlow.trend]);
  const balances = cashFlow.balances || { cash: 0, bank: 0, total: 0 };
  const summary = cashFlow.summary || {};

  const yMax = useMemo(() => {
    let max = 0;
    for (const row of trend) {
      max = Math.max(max, row.totalIn || 0, row.totalOut || 0);
    }
    return max > 0 ? Math.ceil(max * 1.15) : 1000;
  }, [trend]);

  const kpis = [
    { cls: "is-cash-balance", Icon: Wallet, label: "Cash on hand", value: balances.cash },
    { cls: "is-bank-balance", Icon: Landmark, label: "Bank balance", value: balances.bank },
    { cls: "is-money-in", Icon: ArrowDownLeft, label: "Money in", value: summary.totalIn || 0 },
    { cls: "is-money-out", Icon: ArrowUpRight, label: "Money out", value: summary.totalOut || 0 },
    { cls: (summary.net || 0) >= 0 ? "is-net-positive" : "is-net-negative", Icon: TrendingUp, label: "Net flow", value: summary.net || 0 },
  ];

  return (
    <section className="erp-dash-trading-panel erp-dash-cash-panel min-w-0">
      <div className="erp-dash-trading-head">
        <div>
          <h2 className="erp-dash-trading-title">Money flow</h2>
          <p className="erp-dash-trading-sub">Cash and bank in vs out · last 7 days</p>
        </div>
        <div className="erp-dash-trading-kpis">
          {kpis.map(({ cls, Icon, label, value }) => (
            <div key={label} className={`erp-dash-trading-kpi ${cls}`}>
              <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
              <div>
                <p className="erp-dash-trading-kpi-label">{label}</p>
                <p className="erp-dash-trading-kpi-value num">{formatCurrency(value)}</p>
              </div>
            </div>
          ))}
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
        <div className="h-56 sm:h-64 lg:h-72 w-full min-w-0 font-mono">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <ComposedChart data={trend} margin={{ top: 12, right: 12, left: 0, bottom: 4 }} barGap={3} barCategoryGap="28%">
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
                tickFormatter={formatAxisMoney}
              />
              <Tooltip content={<CashFlowTooltip />} cursor={{ fill: "var(--surface-2)" }} />
              <Bar dataKey="totalIn" name="Money in" fill="var(--brand)" radius={[3, 3, 0, 0]} maxBarSize={22} />
              <Bar dataKey="totalOut" name="Money out" fill="var(--cyan)" radius={[3, 3, 0, 0]} maxBarSize={22} opacity={0.9} />
              <Line
                type="monotone"
                dataKey="net"
                name="Net flow"
                stroke="var(--ink)"
                strokeWidth={1.75}
                dot={{ r: 2.5, fill: "var(--ink)", strokeWidth: 0 }}
                activeDot={{ r: 4, fill: "var(--ink)", stroke: "var(--surface)", strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

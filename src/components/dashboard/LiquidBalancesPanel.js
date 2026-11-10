"use client";

import React, { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Landmark, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import DashboardChartTooltip from "@/components/dashboard/DashboardChartTooltip";

const SLICE_COLORS = ["var(--ok)", "var(--brand)"];

export default function LiquidBalancesPanel({ balances = {} }) {
  const cash = balances.cash || 0;
  const bank = balances.bank || 0;
  const total = balances.total || cash + bank;

  const chartData = useMemo(
    () => [
      { name: "Cash", value: Math.max(cash, 0) },
      { name: "Bank", value: Math.max(bank, 0) },
    ].filter((d) => d.value > 0),
    [cash, bank]
  );

  const cashPct = total > 0 ? Math.round((cash / total) * 100) : 0;
  const bankPct = total > 0 ? Math.round((bank / total) * 100) : 0;

  return (
    <section className="erp-dash-finance-panel min-w-0">
      <div className="erp-dash-finance-head">
        <div className="flex items-start gap-2.5">
          <span className="erp-dash-finance-icon is-liquid">
            <Wallet className="w-4 h-4" strokeWidth={1.75} />
          </span>
          <div>
            <h2 className="erp-dash-finance-title">Liquid balances</h2>
            <p className="erp-dash-finance-sub">Cash vs bank split · current</p>
          </div>
        </div>
        <div className="text-right">
          <p className="erp-dash-finance-total-label">Total liquid</p>
          <p className="erp-dash-finance-total is-neutral num">{formatCurrency(total)}</p>
        </div>
      </div>

      <div className="erp-dash-finance-chart-wrap erp-dash-liquid-body">
        {chartData.length === 0 ? (
          <p className="erp-dash-finance-empty">No cash or bank balances recorded.</p>
        ) : (
          <div className="erp-dash-liquid-grid">
            <div className="h-44 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {chartData.map((entry, i) => (
                      <Cell key={entry.name} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<DashboardChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <ul className="erp-dash-liquid-stats">
              <li className="erp-dash-liquid-stat is-cash">
                <Wallet className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                <div>
                  <p className="erp-dash-liquid-stat-label">Cash · {cashPct}%</p>
                  <p className="erp-dash-liquid-stat-value num">{formatCurrency(cash)}</p>
                </div>
              </li>
              <li className="erp-dash-liquid-stat is-bank">
                <Landmark className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                <div>
                  <p className="erp-dash-liquid-stat-label">Bank · {bankPct}%</p>
                  <p className="erp-dash-liquid-stat-value num">{formatCurrency(bank)}</p>
                </div>
              </li>
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

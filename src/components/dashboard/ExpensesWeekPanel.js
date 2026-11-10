"use client";

import React, { useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Receipt } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import DashboardChartTooltip from "@/components/dashboard/DashboardChartTooltip";

export default function ExpensesWeekPanel({ expenses = {} }) {
  const trend = useMemo(() => expenses.trend || [], [expenses.trend]);
  const categories = useMemo(() => expenses.categories || [], [expenses.categories]);
  const total = expenses.total || 0;

  const yMax = useMemo(() => {
    let max = 0;
    for (const row of trend) max = Math.max(max, row.amount || 0);
    return max > 0 ? Math.ceil(max * 1.15) : 1000;
  }, [trend]);

  const catMax = useMemo(
    () => Math.max(...categories.map((c) => c.total), 1),
    [categories]
  );

  return (
    <section className="erp-dash-finance-panel min-w-0">
      <div className="erp-dash-finance-head">
        <div className="flex items-start gap-2.5">
          <span className="erp-dash-finance-icon is-expense">
            <Receipt className="w-4 h-4" strokeWidth={1.75} />
          </span>
          <div>
            <h2 className="erp-dash-finance-title">Weekly expenses</h2>
            <p className="erp-dash-finance-sub">Daily spend and top categories · last 7 days</p>
          </div>
        </div>
        <div className="text-right">
          <p className="erp-dash-finance-total-label">Total spent</p>
          <p className="erp-dash-finance-total is-out num">{formatCurrency(total)}</p>
        </div>
      </div>

      <div className="erp-dash-finance-chart-wrap">
        <div className="h-40 w-full min-w-0 mb-3 font-mono">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="dashExpenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--bad)" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="var(--bad)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 3" vertical={false} stroke="var(--line)" />
              <XAxis dataKey="day" stroke="var(--ink-3)" tick={{ fill: "var(--ink-3)", fontSize: 10.5 }} tickLine={false} axisLine={false} dy={6} />
              <YAxis
                stroke="var(--ink-3)"
                tick={{ fill: "var(--ink-3)", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={48}
                domain={[0, yMax]}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
              />
              <Tooltip content={<DashboardChartTooltip />} cursor={{ stroke: "var(--line-strong)", strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="amount"
                name="Expenses"
                stroke="var(--bad)"
                fill="url(#dashExpenseGrad)"
                strokeWidth={1.75}
                dot={{ r: 2.5, fill: "var(--bad)", strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {categories.length === 0 ? (
          <p className="erp-dash-finance-empty">No expenses recorded this week.</p>
        ) : (
          <ul className="erp-dash-expense-cats">
            {categories.map((cat) => (
              <li key={cat.category} className="erp-dash-expense-cat">
                <div className="erp-dash-expense-cat-top">
                  <span className="erp-dash-expense-cat-name">{cat.category}</span>
                  <span className="erp-dash-expense-cat-amt num">{formatCurrency(cat.total)}</span>
                </div>
                <div className="erp-dash-expense-cat-track">
                  <span
                    className="erp-dash-expense-cat-bar"
                    style={{ width: `${Math.round((cat.total / catMax) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

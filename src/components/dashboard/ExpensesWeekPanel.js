"use client";

import React, { useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Receipt } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import DashboardChartTooltip from "@/components/dashboard/DashboardChartTooltip";

export default function ExpensesWeekPanel({ expenses = {} }) {
  const trend = expenses.trend || [];
  const categories = expenses.categories || [];
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
            <Receipt className="w-4 h-4" />
          </span>
          <div>
            <h2 className="erp-dash-finance-title">Weekly expenses</h2>
            <p className="erp-dash-finance-sub">Daily spend and top categories · last 7 days</p>
          </div>
        </div>
        <div>
          <p className="erp-dash-finance-total-label is-out">Total spent</p>
          <p className="erp-dash-finance-total is-out">{formatCurrency(total)}</p>
        </div>
      </div>

      <div className="erp-dash-finance-chart-wrap">
        <div className="h-40 w-full min-w-0 mb-3">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="dashExpenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#dc2626" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#dc2626" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} dy={6} />
              <YAxis
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={48}
                domain={[0, yMax]}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
              />
              <Tooltip content={<DashboardChartTooltip />} cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="amount"
                name="Expenses"
                stroke="#dc2626"
                fill="url(#dashExpenseGrad)"
                strokeWidth={2}
                dot={{ r: 3, fill: "#dc2626", strokeWidth: 0 }}
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
                  <span className="erp-dash-expense-cat-amt">{formatCurrency(cat.total)}</span>
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

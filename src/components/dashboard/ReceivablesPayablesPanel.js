"use client";

import React, { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Scale } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import DashboardChartTooltip from "@/components/dashboard/DashboardChartTooltip";

const COLORS = {
  receivable: "#16a34a",
  payable: "#dc2626",
  shop: "#22c55e",
  company: "#059669",
  farmer: "#ef4444",
  transport: "#f97316",
  general: "#64748b",
};

export default function ReceivablesPayablesPanel({ receivables = {}, payables = {} }) {
  const chartData = useMemo(() => {
    const rows = [
      { name: "Receivables", amount: receivables.total || 0, type: "receivable" },
      { name: "Payables", amount: payables.total || 0, type: "payable" },
    ];
    return rows.filter((r) => r.amount > 0);
  }, [receivables.total, payables.total]);

  const breakdown = useMemo(() => {
    const rec = (receivables.breakdown || []).map((r) => ({
      name: r.label,
      amount: r.amount,
      type: "receivable",
    }));
    const pay = (payables.breakdown || []).map((p) => ({
      name: p.label,
      amount: p.amount,
      type: "payable",
    }));
    return [...rec, ...pay].sort((a, b) => b.amount - a.amount);
  }, [receivables.breakdown, payables.breakdown]);

  const yMax = useMemo(() => {
    const max = Math.max(receivables.total || 0, payables.total || 0, ...breakdown.map((b) => b.amount));
    return max > 0 ? Math.ceil(max * 1.12) : 1000;
  }, [receivables.total, payables.total, breakdown]);

  return (
    <section className="erp-dash-finance-panel min-w-0">
      <div className="erp-dash-finance-head">
        <div className="flex items-start gap-2.5">
          <span className="erp-dash-finance-icon is-balance">
            <Scale className="w-4 h-4" />
          </span>
          <div>
            <h2 className="erp-dash-finance-title">Receivables vs payables</h2>
            <p className="erp-dash-finance-sub">Outstanding balances by party type</p>
          </div>
        </div>
        <div className="erp-dash-finance-totals">
          <div>
            <p className="erp-dash-finance-total-label is-in">Receivables</p>
            <p className="erp-dash-finance-total is-in">{formatCurrency(receivables.total || 0)}</p>
          </div>
          <div>
            <p className="erp-dash-finance-total-label is-out">Payables</p>
            <p className="erp-dash-finance-total is-out">{formatCurrency(payables.total || 0)}</p>
          </div>
        </div>
      </div>

      <div className="erp-dash-finance-chart-wrap">
        {chartData.length === 0 ? (
          <p className="erp-dash-finance-empty">No outstanding receivables or payables.</p>
        ) : (
          <>
            <div className="h-40 w-full min-w-0 mb-3">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide domain={[0, yMax]} />
                  <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<DashboardChartTooltip />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
                  <Bar dataKey="amount" name="Amount" radius={[0, 6, 6, 0]} maxBarSize={22}>
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={COLORS[entry.type]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {breakdown.length > 0 && (
              <ul className="erp-dash-finance-breakdown">
                {breakdown.map((row) => (
                  <li key={row.name} className="erp-dash-finance-breakdown-row">
                    <span className={`erp-dash-finance-breakdown-dot is-${row.type}`} />
                    <span className="erp-dash-finance-breakdown-name">{row.name}</span>
                    <span className={`erp-dash-finance-breakdown-amt is-${row.type}`}>
                      {formatCurrency(row.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </section>
  );
}

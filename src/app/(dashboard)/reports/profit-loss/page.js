"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/context/ToastContext";
import ReportShell, { ReportDateFilter } from "@/components/reports/ReportShell";
import { PieChart, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

function DetailRow({ label, value, bold = false, positive }) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-0">
      <span className={`text-sm ${bold ? "font-bold text-slate-900" : "text-slate-500"}`}>{label}</span>
      <span className={`font-mono text-sm ${bold ? "font-black text-lg" : "font-semibold"} ${
        positive === true ? "text-emerald-600" : positive === false ? "text-red-500" : "text-slate-900"
      }`}>
        {value}
      </span>
    </div>
  );
}

export default function ProfitLossReportPage() {
  const { showToast } = useToast();
  const [summary, setSummary] = useState({
    revenue: 0, cogs: 0, grossProfit: 0, operatingExpenses: 0, transportCosts: 0, netProfit: 0,
  });
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const fetchReport = async (fromVal = from, toVal = to) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromVal) params.set("from", fromVal);
      if (toVal) params.set("to", toVal);
      const res = await fetch(`/api/reports/profit-loss?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setSummary(data.summary || {});
        setMonthlyTrend(data.monthlyTrend || []);
      } else showToast(data.error || "Failed to load profit & loss report", "error");
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ReportShell
      badge="Finance"
      badgeIcon={PieChart}
      title="Profit & loss statement"
      description="Revenue minus cost of goods sold, operating expenses, and transport costs."
      loadingOnly={loading && monthlyTrend.length === 0 && summary.revenue === 0}
      filterBar={
        <ReportDateFilter
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
          onApply={() => fetchReport(from, to)}
          onClear={() => { setFrom(""); setTo(""); fetchReport("", ""); }}
          accentBtnClass="bg-acc-accounts hover:bg-indigo-600"
        />
      }
      stats={[
        { label: "Revenue", value: formatCurrency(summary.revenue), icon: TrendingUp },
        { label: "Cost of goods", value: formatCurrency(summary.cogs), icon: TrendingDown, valueClass: "text-red-600" },
        { label: "Gross profit", value: formatCurrency(summary.grossProfit), icon: DollarSign },
        {
          label: "Net profit",
          value: formatCurrency(summary.netProfit),
          icon: DollarSign,
          valueClass: summary.netProfit >= 0 ? "text-emerald-600" : "text-red-600",
        },
      ]}
      registerTitle="Statement breakdown"
      registerMeta={from || to ? `${from || "…"} to ${to || "…"}` : "All time"}
    >
      <div className="erp-reports-pl-layout">
        <div className="erp-reports-pl-chart">
          <h3>Monthly revenue trend</h3>
          {monthlyTrend.length === 0 ? (
            <p className="text-sm text-slate-500 py-10 text-center">Not enough data to chart a trend.</p>
          ) : (
            <div className="h-72 w-full px-4 pb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="month" stroke="var(--ink-3)" fontSize={12} tickLine={false} />
                  <YAxis stroke="var(--ink-3)" fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px", color: "var(--ink)" }}
                    formatter={(value) => formatCurrency(value)}
                  />
                  <Bar dataKey="total" fill="var(--brand)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="erp-reports-pl-breakdown">
          <h3>Income statement</h3>
          <DetailRow label="Revenue" value={formatCurrency(summary.revenue)} positive />
          <DetailRow label="Cost of Goods Sold" value={`(${formatCurrency(summary.cogs)})`} positive={false} />
          <DetailRow label="Gross Profit" value={formatCurrency(summary.grossProfit)} bold />
          <DetailRow label="Operating Expenses" value={`(${formatCurrency(summary.operatingExpenses)})`} positive={false} />
          <DetailRow label="Transport Costs" value={`(${formatCurrency(summary.transportCosts)})`} positive={false} />
          <DetailRow label="Net Profit" value={formatCurrency(summary.netProfit)} bold positive={summary.netProfit >= 0} />
        </div>
      </div>
    </ReportShell>
  );
}

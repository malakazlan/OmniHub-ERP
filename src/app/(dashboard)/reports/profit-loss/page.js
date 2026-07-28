"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { PageHeader, StatCard } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/Button";
import { PieChart, Loader2, ArrowLeft, TrendingUp, TrendingDown, DollarSign, Truck } from "lucide-react";
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

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
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

  useEffect(() => { fetchReport(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-8 page-enter pb-10">
      <PageHeader
        module="accounts"
        title="Profit & Loss"
        description="Revenue minus cost of goods sold, expenses, and transport."
        icon={PieChart}
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Profit & Loss" }]}
        actions={
          <Link href="/reports"><Button variant="outline" className="border-slate-200 text-slate-600"><ArrowLeft className="w-4 h-4" /> Back</Button></Link>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input-field text-xs" />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input-field text-xs" />
          </div>
          <Button onClick={fetchReport} className="bg-acc-accounts hover:bg-indigo-600 border-0">Apply Filter</Button>
          {(from || to) && (
            <button type="button" onClick={() => { setFrom(""); setTo(""); setTimeout(fetchReport, 0); }} className="text-xs text-slate-500 hover:text-slate-800 underline">Clear</button>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="h-48 flex items-center justify-center"><Loader2 className="w-8 h-8 text-acc-accounts animate-spin" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard module="accounts" label="Revenue" value={formatCurrency(summary.revenue)} icon={TrendingUp} />
            <StatCard module="accounts" label="Cost of Goods" value={formatCurrency(summary.cogs)} icon={TrendingDown} valueClassName="text-red-500" />
            <StatCard module="accounts" label="Gross Profit" value={formatCurrency(summary.grossProfit)} icon={DollarSign} />
            <StatCard
              module="accounts" label="Net Profit" value={formatCurrency(summary.netProfit)} icon={DollarSign}
              valueClassName={summary.netProfit >= 0 ? "text-emerald-600" : "text-red-500"}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2">
              <CardContent>
                <h2 className="text-sm font-bold text-slate-900 mb-4">Monthly Revenue Trend</h2>
                {monthlyTrend.length === 0 ? (
                  <p className="text-sm text-slate-500 py-10 text-center">Not enough data to chart a trend.</p>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", color: "#0f172a" }}
                          formatter={(value) => formatCurrency(value)}
                        />
                        <Bar dataKey="total" fill="#4338CA" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <h2 className="text-sm font-bold text-slate-900 mb-2">Statement Breakdown</h2>
                <DetailRow label="Revenue" value={formatCurrency(summary.revenue)} positive />
                <DetailRow label="Cost of Goods Sold" value={`(${formatCurrency(summary.cogs)})`} positive={false} />
                <DetailRow label="Gross Profit" value={formatCurrency(summary.grossProfit)} bold />
                <DetailRow label="Operating Expenses" value={`(${formatCurrency(summary.operatingExpenses)})`} positive={false} />
                <DetailRow label="Transport Costs" value={`(${formatCurrency(summary.transportCosts)})`} positive={false} />
                <DetailRow label="Net Profit" value={formatCurrency(summary.netProfit)} bold positive={summary.netProfit >= 0} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/Button";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { ArrowLeft, Loader2, Percent, RefreshCw } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function CommissionPage() {
  const { showToast } = useToast();
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [commissions, setCommissions] = useState([]);
  const [summary, setSummary] = useState({ total: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async (doSync = false) => {
    setLoading(true);
    try {
      const url = `/api/hr/commission?month=${month}&year=${year}${doSync ? "&sync=1" : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setCommissions(data.commissions || []);
        setSummary(data.summary || { total: 0, pending: 0 });
        if (doSync) showToast("Synced commissions from sales", "success");
      }
    } catch {
      showToast("Failed to load commissions", "error");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [month, year, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="erp-hr-surface page-enter pb-8">
      <div className="erp-hr-page space-y-5">
        <header className="erp-hr-page-header">
          <div>
            <Link href="/hr" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[var(--brand)] mb-2">
              <ArrowLeft className="w-3.5 h-3.5" /> Employees & Payroll
            </Link>
            <div className="erp-hr-page-badge"><Percent className="w-3.5 h-3.5" /> Commission</div>
            <h1 className="erp-hr-page-title">Commission list</h1>
            <p className="erp-hr-page-desc">Commission on invoices — auto list from linked sales rep accounts.</p>
          </div>
          <Button
            variant="outline"
            onClick={() => { setSyncing(true); load(true); }}
            disabled={syncing}
            className="border-[var(--brand-line)] text-acc-hr"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sync from sales
          </Button>
        </header>

        <div className="erp-hr-filter-bar">
          <div className="erp-hr-filter-field">
            <label>Month</label>
            <select value={month} onChange={(e) => setMonth(e.target.value)} className="erp-finance-input">
              {MONTHS.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
            </select>
          </div>
          <div className="erp-hr-filter-field">
            <label>Year</label>
            <input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="erp-finance-input w-28 font-mono" />
          </div>
        </div>

        <div className="erp-hr-stats">
          <div className="erp-hr-stat"><div><p className="erp-hr-stat-label">Total commission</p><p className="erp-hr-stat-value">{formatCurrency(summary.total)}</p></div></div>
          <div className="erp-hr-stat"><div><p className="erp-hr-stat-label">Pending</p><p className="erp-hr-stat-value">{formatCurrency(summary.pending)}</p></div></div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : commissions.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No commissions — set commission rate on employee and sync from sales.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">Employee</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2 text-right">Sale</th>
                  <th className="px-4 py-2 text-right">Rate</th>
                  <th className="px-4 py-2 text-right">Commission</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {commissions.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-2 font-semibold">{c.employee?.name}</td>
                    <td className="px-4 py-2">{formatDate(c.commissionDate)}</td>
                    <td className="px-4 py-2 text-right font-mono">{formatCurrency(c.saleAmount)}</td>
                    <td className="px-4 py-2 text-right">{c.commissionRate}%</td>
                    <td className="px-4 py-2 text-right font-mono font-bold">{formatCurrency(c.commissionAmount)}</td>
                    <td className="px-4 py-2 capitalize">{c.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

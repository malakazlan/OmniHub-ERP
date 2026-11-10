"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/Button";
import { formatCurrency } from "@/lib/formatters";
import { ArrowLeft, Bell, Loader2 } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function SalaryRemindersPage() {
  const { showToast } = useToast();
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [reminders, setReminders] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hr/reminders?month=${month}&year=${year}`);
      const data = await res.json();
      if (res.ok) {
        setReminders(data.reminders || []);
        setSummary(data.summary || {});
      }
    } catch {
      showToast("Failed to load reminders", "error");
    } finally {
      setLoading(false);
    }
  }, [month, year, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="erp-hr-surface page-enter pb-8">
      <div className="erp-hr-page space-y-5 max-w-3xl mx-auto">
        <header className="erp-hr-page-header">
          <div>
            <Link href="/hr" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-pink-700 mb-2">
              <ArrowLeft className="w-3.5 h-3.5" /> Employees & Payroll
            </Link>
            <div className="erp-hr-page-badge"><Bell className="w-3.5 h-3.5" /> Reminders</div>
            <h1 className="erp-hr-page-title">Salary review reminder</h1>
            <p className="erp-hr-page-desc">Employees with missing salary records or pending payments for the selected month.</p>
          </div>
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
          <div className="erp-hr-stat"><div><p className="erp-hr-stat-label">Need action</p><p className="erp-hr-stat-value">{summary.total || 0}</p></div></div>
          <div className="erp-hr-stat"><div><p className="erp-hr-stat-label">Missing salary</p><p className="erp-hr-stat-value">{summary.missingSalary || 0}</p></div></div>
          <div className="erp-hr-stat"><div><p className="erp-hr-stat-label">Pending pay</p><p className="erp-hr-stat-value">{summary.pendingPayment || 0}</p></div></div>
        </div>

        <div className="space-y-2">
          {loading ? (
            <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : reminders.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8 rounded-xl border border-dashed border-slate-200">All salaries up to date for this month.</p>
          ) : (
            reminders.map((r) => (
              <div key={r.employee.id} className="rounded-xl border border-amber-200 bg-amber-50/40 px-4 py-3 flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{r.employee.name}</p>
                  <p className="text-xs text-slate-600">{r.message}</p>
                  {(r.pendingAdvance > 0 || r.pendingCommission > 0) && (
                    <p className="text-xs text-slate-500 mt-1">
                      Advance {formatCurrency(r.pendingAdvance)} · Commission {formatCurrency(r.pendingCommission)}
                    </p>
                  )}
                </div>
                <Link href="/hr/salary/clearance">
                  <Button size="sm" className="bg-acc-hr border-0 text-xs">Clear pay →</Button>
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

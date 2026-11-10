"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/Button";
import PaymentSplitFields from "@/components/accounts/PaymentSplitFields";
import { useDefaultCashAccountId } from "@/hooks/useDefaultCashAccount";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { ArrowDownCircle, ArrowLeft, Loader2 } from "lucide-react";

export default function SalaryAdvancesPage() {
  const { showToast } = useToast();
  const defaultCashAccountId = useDefaultCashAccountId();
  const [employees, setEmployees] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [form, setForm] = useState({
    employeeId: "",
    amount: "",
    cashAmount: "",
    bankAmount: "",
    cashAccountId: "",
    bankAccountId: "",
    advanceDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [advRes, accRes] = await Promise.all([
        fetch("/api/hr/advances"),
        fetch("/api/accounts"),
      ]);
      const advData = await advRes.json();
      const accData = await accRes.json();
      if (advRes.ok) {
        setAdvances(advData.advances || []);
        setEmployees(advData.employees || []);
      }
      if (accRes.ok && accData.accounts) {
        setCashAccounts(accData.accounts.filter((a) => a.category === "cash"));
        setBankAccounts(accData.accounts.filter((a) => a.category === "bank"));
      }
    } catch {
      showToast("Failed to load advances", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
    if (defaultCashAccountId) {
      setForm((f) => ({ ...f, cashAccountId: String(defaultCashAccountId) }));
    }
  }, [load, defaultCashAccountId]);

  const onChange = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(form.amount) || 0;
    if (!form.employeeId || amount <= 0) {
      showToast("Select employee and enter amount", "warning");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/hr/advances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          cashAmount: form.cashAmount || amount,
          amount,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Advance posted", "success");
        setForm((f) => ({ ...f, amount: "", notes: "" }));
        load();
      } else showToast(data.error || "Failed", "error");
    } catch {
      showToast("Error posting advance", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="erp-hr-surface page-enter pb-8">
      <div className="erp-hr-page space-y-5 max-w-4xl mx-auto">
        <header className="erp-hr-page-header">
          <div>
            <Link href="/hr" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-pink-700 mb-2">
              <ArrowLeft className="w-3.5 h-3.5" /> Employees & Payroll
            </Link>
            <div className="erp-hr-page-badge"><ArrowDownCircle className="w-3.5 h-3.5" /> Salary advance</div>
            <h1 className="erp-hr-page-title">Salary advance</h1>
            <p className="erp-hr-page-desc">Pay mid-month advances and track pending balances per employee.</p>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-4 space-y-4 shadow-sm">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase text-slate-500">Employee</label>
              <select value={form.employeeId} onChange={(e) => onChange("employeeId", e.target.value)} className="input-field w-full text-sm" required>
                <option value="">Select…</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase text-slate-500">Date</label>
              <input type="date" value={form.advanceDate} onChange={(e) => onChange("advanceDate", e.target.value)} className="input-field w-full text-sm" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase text-slate-500">Advance amount</label>
            <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => onChange("amount", e.target.value)} className="input-field w-full max-w-xs font-mono text-sm" required />
          </div>
          <PaymentSplitFields
            cashAmount={form.cashAmount || form.amount}
            bankAmount={form.bankAmount}
            cashAccountId={form.cashAccountId}
            bankAccountId={form.bankAccountId}
            onChange={onChange}
            cashAccounts={cashAccounts}
            bankAccounts={bankAccounts}
            defaultCashAccountId={defaultCashAccountId ? String(defaultCashAccountId) : ""}
          />
          <input type="text" value={form.notes} onChange={(e) => onChange("notes", e.target.value)} placeholder="Notes (optional)" className="input-field w-full text-sm" />
          <Button type="submit" disabled={submitting} className="bg-acc-hr border-0">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Post advance
          </Button>
        </form>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 font-bold text-sm">Advance register</div>
          {loading ? (
            <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : advances.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No advances yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {advances.map((a) => (
                <div key={a.id} className="px-4 py-3 flex flex-wrap justify-between gap-2 text-sm">
                  <div>
                    <p className="font-semibold text-slate-900">{a.employee?.name}</p>
                    <p className="text-xs text-slate-500">{formatDate(a.advanceDate)} · {a.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold">{formatCurrency(a.amount)}</p>
                    {a.balance > 0 && <p className="text-xs text-amber-700">Pending {formatCurrency(a.balance)}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

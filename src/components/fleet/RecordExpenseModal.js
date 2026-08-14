"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useToast } from "@/context/ToastContext";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/Button";
import { Loader2 } from "lucide-react";
import { EXPENSE_TYPES, emptyExpenseForm } from "@/components/fleet/fleetConstants";
import { vehicleLabel } from "@/lib/fleetStats";

export default function RecordExpenseModal({ isOpen, onClose, onSuccess, vehicle, cashAccounts = [], bankAccounts = [] }) {
  const { showToast } = useToast();
  const [form, setForm] = useState(emptyExpenseForm);
  const [submitting, setSubmitting] = useState(false);

  const defaultCashId = useMemo(() => {
    if (!cashAccounts.length) return "";
    return String(cashAccounts[0].id);
  }, [cashAccounts]);

  const defaultBankId = useMemo(() => {
    if (!bankAccounts.length) return "";
    return String(bankAccounts[0].id);
  }, [bankAccounts]);

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      ...emptyExpenseForm,
      accountId: defaultCashId,
    });
  }, [isOpen, defaultCashId]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const setPaymentChannel = (channel) => {
    setForm((f) => ({
      ...f,
      paymentChannel: channel,
      accountId: channel === "cash" ? defaultCashId : defaultBankId,
    }));
  };

  const selectedAccount = useMemo(() => {
    const list = form.paymentChannel === "cash" ? cashAccounts : bankAccounts;
    return list.find((a) => String(a.id) === String(form.accountId)) || list[0];
  }, [form.paymentChannel, form.accountId, cashAccounts, bankAccounts]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vehicle?.id || !form.amount) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/transport/vehicle-expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicle.id,
          expenseDate: form.expenseDate,
          expenseType: form.expenseType,
          amount: form.amount,
          description: form.description,
          paymentMethod: form.paymentChannel === "cash" ? "cash" : "bank_transfer",
          accountId: form.accountId || undefined,
          notes: form.notes,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onSuccess?.(data.expense);
        onClose();
      } else {
        showToast(data.error || "Failed to save expense", "error");
      }
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const subtitle = vehicle ? `${vehicle.registrationNumber} · ${vehicleLabel(vehicle)}` : "";

  const footer = (
    <div className="flex justify-end gap-2">
      <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
        Cancel
      </button>
      <Button type="submit" form="fleet-expense-form" disabled={submitting || !vehicle} className="bg-[#F97316] hover:bg-orange-600 border-0 min-w-[120px]">
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save expense"}
      </Button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record expense" size="md" footer={footer}>
      {subtitle && <p className="text-sm text-slate-500 -mt-2 mb-4">{subtitle}</p>}
      <form id="fleet-expense-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">Expense type</p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {EXPENSE_TYPES.map(({ key, label, icon: Icon }) => {
              const active = form.expenseType === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => set("expenseType", key)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                    active ? "border-[#2563EB] bg-blue-50/80 text-[#2563EB]" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={1.75} />
                  <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Date</label>
            <input type="date" className="input-field w-full" value={form.expenseDate} onChange={(e) => set("expenseDate", e.target.value)} required />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Amount (PKR) *</label>
            <input type="number" min="0" step="any" className="input-field w-full tabular-nums" value={form.amount} onChange={(e) => set("amount", e.target.value)} required />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Description</label>
            <input type="text" className="input-field w-full" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="e.g. Diesel fill, oil change" />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Payment account</p>
          <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
            {["cash", "bank"].map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => setPaymentChannel(ch)}
                className={`px-5 py-2 text-sm font-semibold capitalize cursor-pointer transition-colors ${
                  form.paymentChannel === ch ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {ch}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-400">Ledger entry is posted to the selected account.</p>
          {selectedAccount && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700/80">
                {form.paymentChannel === "cash" ? "Cash account (your account)" : "Bank account"}
              </p>
              <p className="text-sm font-bold text-emerald-900 mt-0.5">{selectedAccount.name}</p>
              {(form.paymentChannel === "cash" ? cashAccounts : bankAccounts).length > 1 && (
                <select
                  className="input-field w-full mt-2 text-xs"
                  value={form.accountId}
                  onChange={(e) => set("accountId", e.target.value)}
                >
                  {(form.paymentChannel === "cash" ? cashAccounts : bankAccounts).map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}

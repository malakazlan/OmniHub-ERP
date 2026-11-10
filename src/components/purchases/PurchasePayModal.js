"use client";

import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/Button";
import { useToast } from "@/context/ToastContext";
import { formatCurrency, parseNumber } from "@/lib/formatters";
import { Loader2, Wallet } from "lucide-react";
import { useDefaultCashAccountId } from "@/hooks/useDefaultCashAccount";

export function PurchasePayModal({ purchase, open, onClose, onPaid }) {
  const { showToast } = useToast();
  const defaultCashAccountId = useDefaultCashAccountId();
  const [submitting, setSubmitting] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({
    paymentDate: new Date().toISOString().slice(0, 10),
    cashAmount: "",
    bankAmount: "",
    cashAccountId: "",
    bankAccountId: "",
    notes: "",
  });

  const balanceDue = purchase
    ? Math.max((purchase.totalAmount || 0) - (purchase.paidAmount || 0), 0)
    : 0;

  useEffect(() => {
    if (!open) return;
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((d) => {
        if (d.accounts) setAccounts(d.accounts.filter((a) => a.isActive));
      })
      .catch(() => {});
    setForm((f) => ({
      ...f,
      paymentDate: new Date().toISOString().slice(0, 10),
      cashAmount: "",
      bankAmount: "",
      cashAccountId: purchase?.cashAccountId
        ? String(purchase.cashAccountId)
        : defaultCashAccountId || "",
      bankAccountId: "",
    }));
  }, [open, purchase?.id, defaultCashAccountId]);

  const cashAccounts = accounts.filter((a) => a.category === "cash");
  const bankAccounts = accounts.filter((a) => a.category === "bank");

  const payFullBalance = () => {
    setForm((f) => ({
      ...f,
      cashAmount: String(balanceDue),
      bankAmount: "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!purchase?.id) return;

    const cashAmount = parseNumber(form.cashAmount);
    const bankAmount = parseNumber(form.bankAmount);
    if (cashAmount + bankAmount <= 0) {
      showToast("Enter cash and/or bank amount", "warning");
      return;
    }
    if (cashAmount > 0 && !form.cashAccountId && cashAccounts.length > 0 && !purchase.cashAccountId) {
      showToast("Select a cash account", "warning");
      return;
    }
    if (bankAmount > 0 && !form.bankAccountId && bankAccounts.length > 0 && !purchase.bankAccountId) {
      showToast("Select a bank account", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/purchases/${purchase.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentDate: form.paymentDate,
          cashAmount,
          bankAmount,
          cashAccountId: form.cashAccountId || undefined,
          bankAccountId: form.bankAccountId || undefined,
          notes: form.notes,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Payment recorded", "success");
        onPaid?.(data.purchase);
        onClose();
      } else {
        showToast(data.error || "Payment failed", "error");
      }
    } catch {
      showToast("Error processing payment", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!purchase) return null;

  return (
    <Modal isOpen={open} onClose={onClose} title="Pay vendor" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm space-y-1">
          <p className="font-mono font-bold text-slate-900">{purchase.purchaseNumber}</p>
          <p className="text-slate-600">{purchase.vendorName}</p>
          <div className="flex justify-between pt-2 border-t border-slate-200 mt-2">
            <span className="text-slate-500">Balance due</span>
            <span className="font-mono font-bold text-rose-700">{formatCurrency(balanceDue)}</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase text-slate-500">Payment date</label>
          <input
            type="date"
            value={form.paymentDate}
            onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
            className="input-field w-full"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase text-slate-500">Cash</label>
            <input
              type="number"
              min="0"
              step="any"
              value={form.cashAmount}
              onChange={(e) => setForm({ ...form, cashAmount: e.target.value })}
              className="input-field w-full"
              placeholder="0"
            />
            {parseNumber(form.cashAmount) > 0 && cashAccounts.length > 0 && (
              <select
                value={form.cashAccountId}
                onChange={(e) => setForm({ ...form, cashAccountId: e.target.value })}
                className="input-field w-full text-xs mt-1"
              >
                <option value="">Cash account…</option>
                {cashAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase text-slate-500">Bank</label>
            <input
              type="number"
              min="0"
              step="any"
              value={form.bankAmount}
              onChange={(e) => setForm({ ...form, bankAmount: e.target.value })}
              className="input-field w-full"
              placeholder="0"
            />
            {parseNumber(form.bankAmount) > 0 && bankAccounts.length > 0 && (
              <select
                value={form.bankAccountId}
                onChange={(e) => setForm({ ...form, bankAccountId: e.target.value })}
                className="input-field w-full text-xs mt-1"
              >
                <option value="">Bank account…</option>
                {bankAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={payFullBalance}
          className="text-xs font-semibold text-teal-700 hover:text-teal-900 cursor-pointer"
        >
          Fill full balance ({formatCurrency(balanceDue)})
        </button>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} className="border-slate-200">
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || balanceDue <= 0} className="bg-teal-700 hover:bg-teal-800 border-0">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
            Record payment
          </Button>
        </div>
      </form>
    </Modal>
  );
}

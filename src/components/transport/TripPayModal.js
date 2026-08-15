"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useToast } from "@/context/ToastContext";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/Button";
import { Loader2, Wallet, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { tripBalanceDue } from "@/lib/transport";
import { useDefaultCashAccountId } from "@/hooks/useDefaultCashAccount";

export default function TripPayModal({ trip, isOpen, onClose, onSuccess }) {
  const { showToast } = useToast();
  const defaultCashAccountId = useDefaultCashAccountId();
  const [cashAccounts, setCashAccounts] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentChannel: "cash",
    accountId: "",
    amount: "",
    notes: "",
  });

  const balanceDue = trip ? tripBalanceDue(trip) : 0;

  const defaultCashId = useMemo(() => {
    if (defaultCashAccountId) return String(defaultCashAccountId);
    if (!cashAccounts.length) return "";
    return String(cashAccounts[0].id);
  }, [defaultCashAccountId, cashAccounts]);

  const defaultBankId = useMemo(() => {
    if (!bankAccounts.length) return "";
    return String(bankAccounts[0].id);
  }, [bankAccounts]);

  useEffect(() => {
    if (!isOpen) return;
    Promise.all([
      fetch("/api/accounts?category=cash").then((r) => r.json()),
      fetch("/api/accounts?category=bank").then((r) => r.json()),
    ])
      .then(([c, b]) => {
        if (c.accounts) setCashAccounts(c.accounts.filter((a) => a.isActive !== false));
        if (b.accounts) setBankAccounts(b.accounts.filter((a) => a.isActive !== false));
      })
      .catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !trip) return;
    setForm({
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentChannel: "cash",
      accountId: defaultCashId,
      amount: balanceDue > 0 ? String(balanceDue) : "",
      notes: "",
    });
  }, [isOpen, trip?.id, defaultCashId, balanceDue]);

  const setChannel = (channel) => {
    setForm((f) => ({
      ...f,
      paymentChannel: channel,
      accountId: channel === "cash" ? defaultCashId : defaultBankId,
    }));
  };

  const accountList = form.paymentChannel === "cash" ? cashAccounts : bankAccounts;
  const selectedAccount = accountList.find((a) => String(a.id) === String(form.accountId));
  const accountsReady = cashAccounts.length > 0 || bankAccounts.length > 0;
  const lowBalance =
    selectedAccount && parseFloat(form.amount) > 0 && selectedAccount.balance < parseFloat(form.amount);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!trip?.id || !form.amount || !form.accountId) {
      showToast("Amount and payment account are required", "warning");
      return;
    }
    if (balanceDue <= 0) {
      showToast("This trip has no balance due", "warning");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/transport/${trip.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Math.round(parseFloat(form.amount) * 100) / 100,
          accountId: parseInt(form.accountId, 10),
          paymentDate: form.paymentDate,
          notes: form.notes,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Trip payment recorded", "success");
        onSuccess?.(data.transport);
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

  if (!trip) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pay trip freight" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl border border-cyan-100 bg-cyan-50/60 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="erp-trip-tr-num">{trip.transportNumber}</span>
            <span className="text-xs text-slate-500">{trip.driverName}</span>
          </div>
          <div className="erp-trip-route text-sm">
            <span>{trip.originCity}</span>
            <ArrowRight className="w-3 h-3 text-cyan-500" />
            <span>{trip.destinationCity}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-cyan-100 text-sm">
            <span className="text-slate-600">Total charges</span>
            <span className="font-mono font-bold">{formatCurrency(trip.totalCharges)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Already paid</span>
            <span className="font-mono text-emerald-700">{formatCurrency(trip.paidAmount || 0)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span className="text-slate-700">Balance due</span>
            <span className="font-mono text-rose-700">{formatCurrency(balanceDue)}</span>
          </div>
        </div>

        <div>
          <label className="erp-finance-label">Payment date</label>
          <input
            type="date"
            value={form.paymentDate}
            onChange={(e) => setForm((f) => ({ ...f, paymentDate: e.target.value }))}
            className="erp-finance-input"
          />
        </div>

        <div>
          <label className="erp-finance-label">Pay from</label>
          <div className="erp-fleet-pay-tabs mb-2">
            <button
              type="button"
              className={`erp-fleet-pay-tab${form.paymentChannel === "cash" ? " is-active" : ""}`}
              onClick={() => setChannel("cash")}
            >
              Cash
            </button>
            <button
              type="button"
              className={`erp-fleet-pay-tab${form.paymentChannel === "bank" ? " is-active" : ""}`}
              onClick={() => setChannel("bank")}
            >
              Bank
            </button>
          </div>
          <select
            value={form.accountId}
            onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
            className="erp-finance-input"
            required
          >
            <option value="">Select account…</option>
            {accountList.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {formatCurrency(a.balance)}
              </option>
            ))}
          </select>
          {selectedAccount && (
            <p className="text-[11px] text-slate-500 mt-1">
              Available: {formatCurrency(selectedAccount.balance)}
            </p>
          )}
          {lowBalance && (
            <p className="text-[11px] text-amber-700 mt-1 font-semibold">
              Account balance is lower than the payment amount — payment will still be recorded and cash may go negative.
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="erp-finance-label mb-0">Amount *</label>
            <button
              type="button"
              className="text-[11px] font-bold text-cyan-700 hover:underline"
              onClick={() => setForm((f) => ({ ...f, amount: String(balanceDue) }))}
            >
              Pay full balance
            </button>
          </div>
          <input
            type="number"
            step="0.01"
            min="0"
            max={balanceDue}
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            className="erp-finance-input font-mono"
            required
          />
        </div>

        <div>
          <label className="erp-finance-label">Notes</label>
          <input
            type="text"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="erp-finance-input"
            placeholder="Optional"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting || balanceDue <= 0 || !accountsReady || !form.accountId}
            className="bg-acc-transport border-0"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Processing…
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4" /> Record payment
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/Button";
import { useToast } from "@/context/ToastContext";
import { formatCurrency, parseNumber } from "@/lib/formatters";
import { useDefaultCashAccountId } from "@/hooks/useDefaultCashAccount";
import {
  UnpaidPurchaseBillsPanel,
  isVendorLedgerAccount,
} from "@/components/purchases/UnpaidPurchaseBillsPanel";
import {
  UnpaidSaleInvoicesPanel,
  isCustomerLedgerAccount,
} from "@/components/sales/UnpaidSaleInvoicesPanel";
import {
  planFifoPurchaseSettlement,
  planFifoSaleSettlement,
  formatPurchaseClearSummary,
  formatSaleClearSummary,
} from "@/lib/purchase-settlement";
import { Loader2, Plus, Wallet, Building2, Banknote } from "lucide-react";

const emptyForm = {
  paymentDate: new Date().toISOString().slice(0, 10),
  cashAmount: "",
  bankAmount: "",
  cashAccountId: "",
  bankAccountId: "",
  description: "",
  notes: "",
};

export function LedgerPaymentModal({
  open,
  mode,
  account,
  selectedAccountId,
  accounts = [],
  billsRefreshKey,
  purchaseTotalDue = 0,
  salesTotalDue = 0,
  outstandingPurchases = [],
  outstandingSales = [],
  onClose,
  onSuccess,
}) {
  const { showToast } = useToast();
  const defaultCashAccountId = useDefaultCashAccountId();
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const isPay = mode === "pay";
  const partyName = account?.name || "";

  useEffect(() => {
    if (!open) return;
    setForm({
      ...emptyForm,
      paymentDate: new Date().toISOString().slice(0, 10),
      cashAccountId: defaultCashAccountId || "",
      description: isPay ? `Payment to ${partyName}` : `Receipt from ${partyName}`,
    });
  }, [open, mode, partyName, defaultCashAccountId, isPay]);

  const cashAccounts = useMemo(
    () => accounts.filter((a) => a.category === "cash" && a.isActive !== false),
    [accounts]
  );
  const bankAccounts = useMemo(
    () => accounts.filter((a) => a.category === "bank" && a.isActive !== false),
    [accounts]
  );

  const cashAmount = parseNumber(form.cashAmount);
  const bankAmount = parseNumber(form.bankAmount);
  const totalAmount = cashAmount + bankAmount;

  const clearPreview = useMemo(() => {
    if (totalAmount <= 0) return "";
    if (isPay && isVendorLedgerAccount(account) && outstandingPurchases.length > 0) {
      return formatPurchaseClearSummary(
        planFifoPurchaseSettlement(outstandingPurchases, cashAmount, bankAmount).allocations
      );
    }
    if (!isPay && isCustomerLedgerAccount(account) && outstandingSales.length > 0) {
      return formatSaleClearSummary(
        planFifoSaleSettlement(outstandingSales, totalAmount).allocations
      );
    }
    return "";
  }, [isPay, account, cashAmount, bankAmount, totalAmount, outstandingPurchases, outstandingSales]);

  const fillFullDue = () => {
    const due = isPay ? purchaseTotalDue : salesTotalDue;
    setForm((f) => ({ ...f, cashAmount: String(due), bankAmount: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (totalAmount <= 0) {
      showToast("Enter cash and/or bank amount", "warning");
      return;
    }
    if (cashAmount > 0 && !form.cashAccountId && cashAccounts.length > 0) {
      showToast("Select a cash account", "warning");
      return;
    }
    if (bankAmount > 0 && !form.bankAccountId && bankAccounts.length > 0) {
      showToast("Select a bank account", "warning");
      return;
    }
    if (!form.description.trim()) {
      showToast("Description is required", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        mode,
        partyAccountId: selectedAccountId,
        paymentDate: form.paymentDate,
        cashAmount,
        bankAmount,
        cashAccountId: form.cashAccountId || undefined,
        bankAccountId: form.bankAccountId || undefined,
        description: form.description.trim(),
        notes: form.notes.trim() || undefined,
        fromAccountId: isPay ? undefined : String(selectedAccountId),
        toAccountId: isPay ? String(selectedAccountId) : undefined,
      };

      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`${isPay ? "Payment" : "Receipt"} ${data.payment?.paymentNumber || ""} recorded`, "success");
        onSuccess?.(data.receipt, data.payment);
        onClose?.();
      } else {
        showToast(data.error || "Failed to save", "error");
      }
    } catch {
      showToast("Error processing request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !mode) return null;

  const due = isPay ? purchaseTotalDue : salesTotalDue;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={isPay ? `Pay — ${partyName}` : `Receive — ${partyName}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          className={`rounded-xl px-4 py-3 text-xs border ${
            isPay ? "bg-rose-50 border-rose-100 text-rose-900" : "bg-emerald-50 border-emerald-100 text-emerald-900"
          }`}
        >
          {isPay ? (
            <>
              Pay <strong>{partyName}</strong> from your cash and/or bank. Purchase bills clear oldest first.
            </>
          ) : (
            <>
              Receive from <strong>{partyName}</strong> into cash and/or bank. Sales invoices clear oldest first.
            </>
          )}
        </div>

        {isPay && isVendorLedgerAccount(account) && (
          <UnpaidPurchaseBillsPanel accountId={selectedAccountId} refreshKey={billsRefreshKey} embedded />
        )}
        {!isPay && isCustomerLedgerAccount(account) && (
          <UnpaidSaleInvoicesPanel accountId={selectedAccountId} refreshKey={billsRefreshKey} embedded />
        )}

        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Party account</p>
          <p className="text-sm font-bold text-slate-900">{partyName}</p>
          {due > 0 && (
            <p className="text-xs text-slate-600 mt-1">
              Outstanding due: <span className="font-mono font-bold text-rose-700">{formatCurrency(due)}</span>
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Payment date</label>
          <input
            type="date"
            value={form.paymentDate}
            onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
            className="input-field w-full"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 space-y-2">
            <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              <Banknote className="w-3.5 h-3.5" /> Cash amount
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={form.cashAmount}
              onChange={(e) => setForm({ ...form, cashAmount: e.target.value })}
              className="input-field w-full font-mono"
              placeholder="0"
            />
            {(cashAmount > 0 || cashAccounts.length > 0) && (
              <select
                value={form.cashAccountId}
                onChange={(e) => setForm({ ...form, cashAccountId: e.target.value })}
                className="input-field w-full text-xs"
              >
                <option value="">Cash account…</option>
                {cashAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            )}
            {defaultCashAccountId && form.cashAccountId === defaultCashAccountId && (
              <p className="text-[10px] text-emerald-700">Your assigned cash account (auto-selected)</p>
            )}
          </div>

          <div className="rounded-xl border border-sky-200 bg-sky-50/40 p-3 space-y-2">
            <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-sky-800">
              <Building2 className="w-3.5 h-3.5" /> Bank amount
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={form.bankAmount}
              onChange={(e) => setForm({ ...form, bankAmount: e.target.value })}
              className="input-field w-full font-mono"
              placeholder="0"
            />
            {(bankAmount > 0 || bankAccounts.length > 0) && (
              <select
                value={form.bankAccountId}
                onChange={(e) => setForm({ ...form, bankAccountId: e.target.value })}
                className="input-field w-full text-xs"
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

        {due > 0 && (
          <button
            type="button"
            onClick={fillFullDue}
            className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 cursor-pointer"
          >
            Fill full outstanding ({formatCurrency(due)}) in cash
          </button>
        )}

        {totalAmount > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" /> Total {isPay ? "payment" : "receipt"}
            </span>
            <span className="font-mono font-bold text-slate-900">{formatCurrency(totalAmount)}</span>
          </div>
        )}

        {clearPreview && (
          <div className="rounded-lg border border-teal-100 bg-teal-50/70 px-3 py-2.5 text-xs text-teal-900">
            <p className="font-bold uppercase tracking-wide text-[10px] text-teal-800 mb-1">Will auto-clear (oldest first)</p>
            <p className="leading-relaxed">{clearPreview}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Description *</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
            className="input-field w-full"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="input-field w-full h-16 resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 cursor-pointer hover:bg-slate-50"
          >
            Cancel
          </button>
          <Button
            type="submit"
            disabled={submitting}
            className={isPay ? "bg-rose-600 hover:bg-rose-700 border-0" : "bg-emerald-600 hover:bg-emerald-700 border-0"}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {isPay ? "Record payment" : "Record receipt"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

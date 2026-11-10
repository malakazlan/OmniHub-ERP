"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/Button";
import { useToast } from "@/context/ToastContext";
import { formatCurrency, formatDate, parseNumber } from "@/lib/formatters";
import {
  planFifoPurchaseSettlement,
  totalOutstandingDue,
} from "@/lib/purchase-settlement";
import { Loader2, Layers, Wallet } from "lucide-react";
import { useDefaultCashAccountId } from "@/hooks/useDefaultCashAccount";

export function SettlePurchaseBillsModal({
  vendorAccountId,
  vendorName,
  open,
  onClose,
  onSettled,
}) {
  const { showToast } = useToast();
  const defaultCashAccountId = useDefaultCashAccountId();
  const [submitting, setSubmitting] = useState(false);
  const [loadingBills, setLoadingBills] = useState(false);
  const [bills, setBills] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({
    paymentDate: new Date().toISOString().slice(0, 10),
    cashAmount: "",
    bankAmount: "",
    cashAccountId: "",
    bankAccountId: "",
  });

  const totalDue = useMemo(() => totalOutstandingDue(bills), [bills]);

  const plan = useMemo(
    () =>
      planFifoPurchaseSettlement(
        bills,
        parseNumber(form.cashAmount),
        parseNumber(form.bankAmount)
      ),
    [bills, form.cashAmount, form.bankAmount]
  );

  useEffect(() => {
    if (!open || !vendorAccountId) return;

    setLoadingBills(true);
    Promise.all([
      fetch(`/api/purchases?vendorAccountId=${vendorAccountId}&outstanding=true`).then((r) => r.json()),
      fetch("/api/accounts").then((r) => r.json()),
    ])
      .then(([purchaseData, accountData]) => {
        if (purchaseData.purchases) setBills(purchaseData.purchases);
        else setBills([]);
        if (accountData.accounts) {
          setAccounts(accountData.accounts.filter((a) => a.isActive));
        }
      })
      .catch(() => setBills([]))
      .finally(() => setLoadingBills(false));

    setForm({
      paymentDate: new Date().toISOString().slice(0, 10),
      cashAmount: "",
      bankAmount: "",
      cashAccountId: defaultCashAccountId || "",
      bankAccountId: "",
    });
  }, [open, vendorAccountId, defaultCashAccountId]);

  const cashAccounts = accounts.filter((a) => a.category === "cash");
  const bankAccounts = accounts.filter((a) => a.category === "bank");

  const fillFullBalance = () => {
    setForm((f) => ({
      ...f,
      cashAmount: String(totalDue),
      bankAmount: "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vendorAccountId) return;

    const cashAmount = parseNumber(form.cashAmount);
    const bankAmount = parseNumber(form.bankAmount);
    if (cashAmount + bankAmount <= 0) {
      showToast("Enter cash and/or bank amount", "warning");
      return;
    }
    if (plan.allocations.length === 0) {
      showToast("No bills to settle with this amount", "warning");
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

    setSubmitting(true);
    try {
      const res = await fetch("/api/purchases/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorAccountId,
          paymentDate: form.paymentDate,
          cashAmount,
          bankAmount,
          cashAccountId: form.cashAccountId || undefined,
          bankAccountId: form.bankAccountId || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const count = data.allocations?.length || 0;
        showToast(
          count === 1
            ? "1 bill settled (oldest first)"
            : `${count} bills settled (oldest first)`,
          "success"
        );
        onSettled?.(data);
        onClose();
      } else {
        showToast(data.error || "Settlement failed", "error");
      }
    } catch {
      showToast("Error processing settlement", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Auto-settle bills (oldest first)"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm space-y-1">
          <p className="font-bold text-slate-900">{vendorName || "Vendor"}</p>
          <p className="text-xs text-slate-500">
            Payment is applied to unpaid bills starting from the oldest date.
          </p>
          <div className="flex justify-between pt-2 border-t border-slate-200 mt-2">
            <span className="text-slate-500">Total outstanding</span>
            <span className="font-mono font-bold text-rose-700">{formatCurrency(totalDue)}</span>
          </div>
        </div>

        {loadingBills ? (
          <div className="flex justify-center py-6 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : bills.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4 border border-dashed rounded-lg">
            No outstanding bills for this account.
          </p>
        ) : (
          <>
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
                      <option key={a.id} value={a.id}>{a.name}</option>
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
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={fillFullBalance}
              className="text-xs font-semibold text-teal-700 hover:text-teal-900 cursor-pointer"
            >
              Pay full outstanding ({formatCurrency(totalDue)})
            </button>

            {plan.allocations.length > 0 && (
              <div className="rounded-lg border border-teal-100 bg-teal-50/60 p-3 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-teal-800 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" /> Will clear (oldest → newest)
                </p>
                <ul className="space-y-1.5 max-h-36 overflow-y-auto text-xs">
                  {plan.allocations.map((a) => (
                    <li
                      key={a.purchaseId}
                      className="flex justify-between gap-2 bg-white/80 rounded px-2 py-1.5 border border-teal-100/80"
                    >
                      <span>
                        <span className="font-mono font-bold text-slate-800">{a.purchaseNumber}</span>
                        <span className="text-slate-400 ml-1.5">{formatDate(a.purchaseDate)}</span>
                        {a.clearsFully ? (
                          <span className="text-emerald-700 ml-1.5">paid</span>
                        ) : (
                          <span className="text-amber-700 ml-1.5">partial</span>
                        )}
                      </span>
                      <span className="font-mono font-bold text-slate-800 shrink-0">
                        {formatCurrency(a.cashAmount + a.bankAmount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} className="border-slate-200">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting || loadingBills || bills.length === 0 || plan.allocations.length === 0}
            className="bg-teal-700 hover:bg-teal-800 border-0"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
            Settle bills
          </Button>
        </div>
      </form>
    </Modal>
  );
}

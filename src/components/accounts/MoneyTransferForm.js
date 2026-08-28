"use client";

import React, { useMemo } from "react";
import { Button } from "@/components/Button";
import { Loader2, ArrowRight, ArrowDownLeft, Banknote, Building2, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import {
  TRANSFER_TYPES,
  accountsForTransferSide,
} from "@/lib/moneyTransfer";

const TYPE_ICONS = {
  cash_cash: Wallet,
  cash_bank: Banknote,
  bank_bank: Building2,
  bank_cash: ArrowDownLeft,
};

const TYPE_BTN_CLASS = {
  cash_cash: "cash-cash",
  cash_bank: "cash-bank",
  bank_bank: "bank-bank",
  bank_cash: "bank-cash",
};

export const emptyTransferForm = (transferType = "cash_cash") => ({
  transferType,
  transferDate: new Date().toISOString().slice(0, 10),
  fromAccountId: "",
  toAccountId: "",
  amount: "",
  description: "",
  notes: "",
});

export default function MoneyTransferForm({
  form,
  onChange,
  accounts = [],
  submitting = false,
  onSubmit,
  onCancel,
}) {
  const fromAccounts = useMemo(
    () => accountsForTransferSide(accounts, form.transferType, "from"),
    [accounts, form.transferType]
  );
  const toAccounts = useMemo(
    () =>
      accountsForTransferSide(accounts, form.transferType, "to").filter(
        (a) => String(a.id) !== String(form.fromAccountId)
      ),
    [accounts, form.transferType, form.fromAccountId]
  );

  const selectedFrom = fromAccounts.find((a) => String(a.id) === String(form.fromAccountId));
  const selectedTo = toAccounts.find((a) => String(a.id) === String(form.toAccountId));
  const parsedAmount = parseFloat(form.amount) || 0;
  const insufficient =
    selectedFrom && parsedAmount > 0 && Number(selectedFrom.balance || 0) < parsedAmount;

  const handleTypeChange = (type) => {
    onChange({
      ...emptyTransferForm(type),
      transferDate: form.transferDate,
    });
  };

  return (
    <form onSubmit={onSubmit} className="erp-xfer-form space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {Object.values(TRANSFER_TYPES).map((type) => {
          const Icon = TYPE_ICONS[type.id] || ArrowRight;
          const active = form.transferType === type.id;
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => handleTypeChange(type.id)}
              className={`erp-xfer-type-btn ${active ? `is-active ${TYPE_BTN_CLASS[type.id]}` : ""}`}
            >
              <div className={`erp-xfer-type-card-icon ${TYPE_BTN_CLASS[type.id]} ${active ? "scale-105" : ""}`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="mt-3 text-sm font-bold text-slate-900">{type.label}</p>
              <p className="mt-1 text-xs text-slate-500">{type.description}</p>
            </button>
          );
        })}
      </div>

      <div className="erp-xfer-flow-panel">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 items-end">
          <div className="space-y-1.5">
            <label className="erp-finance-label">Transfer from</label>
            <select
              required
              value={form.fromAccountId}
              onChange={(e) =>
                onChange({
                  ...form,
                  fromAccountId: e.target.value,
                  toAccountId:
                    String(form.toAccountId) === e.target.value ? "" : form.toAccountId,
                })
              }
              className="erp-finance-input w-full bg-white"
            >
              <option value="">Select source account...</option>
              {fromAccounts.map((a) => (
                <option key={a.id} value={String(a.id)}>
                  {a.name} · {formatCurrency(a.balance || 0, false)}
                </option>
              ))}
            </select>
            {selectedFrom && (
              <p className="text-[11px] text-slate-500">
                Available: <span className="font-semibold text-slate-800">{formatCurrency(selectedFrom.balance || 0)}</span>
              </p>
            )}
          </div>

          <div className="hidden lg:flex erp-xfer-flow-arrow mx-auto">
            <ArrowRight className="h-4 w-4" />
          </div>

          <div className="space-y-1.5">
            <label className="erp-finance-label">Transfer to</label>
            <select
              required
              value={form.toAccountId}
              onChange={(e) => onChange({ ...form, toAccountId: e.target.value })}
              className="erp-finance-input w-full bg-white"
              disabled={!form.fromAccountId}
            >
              <option value="">Select destination account...</option>
              {toAccounts.map((a) => (
                <option key={a.id} value={String(a.id)}>
                  {a.name} · {formatCurrency(a.balance || 0, false)}
                </option>
              ))}
            </select>
            {selectedTo && (
              <p className="text-[11px] text-slate-500">
                Current: <span className="font-semibold text-slate-800">{formatCurrency(selectedTo.balance || 0)}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="erp-finance-label">Transfer date</label>
          <input
            type="date"
            required
            value={form.transferDate}
            onChange={(e) => onChange({ ...form, transferDate: e.target.value })}
            className="erp-finance-input w-full bg-white"
          />
        </div>
        <div className="space-y-1.5">
          <label className="erp-finance-label">Amount (Rs)</label>
          <input
            type="number"
            required
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={(e) => onChange({ ...form, amount: e.target.value })}
            className="erp-finance-input w-full font-mono text-lg bg-white"
            placeholder="0.00"
          />
          {insufficient && (
            <p className="text-[11px] font-medium text-rose-600">
              Amount exceeds available balance in source account.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="erp-finance-label">Description (optional)</label>
        <input
          type="text"
          value={form.description}
          onChange={(e) => onChange({ ...form, description: e.target.value })}
          className="erp-finance-input w-full bg-white"
          placeholder="e.g. Daily cash deposit, branch transfer"
        />
      </div>

      <div className="space-y-1.5">
        <label className="erp-finance-label">Internal notes (optional)</label>
        <textarea
          value={form.notes}
          onChange={(e) => onChange({ ...form, notes: e.target.value })}
          className="erp-finance-input w-full h-20 resize-none bg-white"
          placeholder="Private note for your records"
        />
      </div>

      {selectedFrom && selectedTo && parsedAmount > 0 && !insufficient && (
        <div className="erp-xfer-preview">
          <span className="font-bold">{formatCurrency(parsedAmount)}</span> will move from{" "}
          <span className="font-bold">{selectedFrom.name}</span> to{" "}
          <span className="font-bold">{selectedTo.name}</span>.
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={submitting || insufficient || !form.fromAccountId || !form.toAccountId}
          className="erp-xfer-btn-primary !bg-[#2563eb] !text-white hover:!bg-[#1d4ed8]"
        >
          {submitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Posting transfer...
            </>
          ) : (
            "Post transfer"
          )}
        </Button>
      </div>
    </form>
  );
}

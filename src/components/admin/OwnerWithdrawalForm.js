"use client";

import React from "react";
import { Button } from "@/components/Button";
import { Loader2 } from "lucide-react";

export const emptyWithdrawalForm = () => ({
  withdrawalDate: new Date().toISOString().slice(0, 10),
  amount: "",
  sourceAccountId: "",
  notes: "",
});

export default function OwnerWithdrawalForm({
  form,
  onChange,
  sourceAccounts = [],
  submitting = false,
  onSubmit,
  onCancel,
}) {
  return (
    <form onSubmit={onSubmit} className="erp-finance-form space-y-4">
      <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
        Withdrawals post to the general ledger as <strong>Owner withdrawal</strong> only — private notes stay on this page.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="erp-finance-label">Date</label>
          <input
            type="date"
            required
            value={form.withdrawalDate}
            onChange={(e) => onChange({ ...form, withdrawalDate: e.target.value })}
            className="erp-finance-input w-full"
          />
        </div>
        <div className="space-y-1">
          <label className="erp-finance-label">Amount</label>
          <input
            type="number"
            required
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={(e) => onChange({ ...form, amount: e.target.value })}
            className="erp-finance-input w-full font-mono"
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="erp-finance-label">Pay from (cash or bank account)</label>
        <select
          required
          value={form.sourceAccountId}
          onChange={(e) => onChange({ ...form, sourceAccountId: e.target.value })}
          className="erp-finance-input w-full"
        >
          <option value="">Select account...</option>
          {sourceAccounts.map((a) => (
            <option key={a.id} value={String(a.id)}>
              {a.name} ({a.category}) · Bal {Number(a.balance || 0).toLocaleString()}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="erp-finance-label">Private note (admin only — not on general ledger)</label>
        <textarea
          value={form.notes}
          onChange={(e) => onChange({ ...form, notes: e.target.value })}
          className="erp-finance-input w-full h-20 resize-none"
          placeholder="Personal use, household, etc."
        />
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting} className="bg-slate-800 border-0">
          {submitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Recording...
            </>
          ) : (
            "Record withdrawal"
          )}
        </Button>
      </div>
    </form>
  );
}

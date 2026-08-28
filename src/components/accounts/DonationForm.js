"use client";

import React from "react";
import { Button } from "@/components/Button";
import { Loader2, Heart, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

export const DONATION_PURPOSES = [
  "Zakat",
  "Sadqa",
  "Mosque / Madrasa",
  "Orphanage",
  "Medical aid",
  "Community support",
  "Other",
];

export const emptyDonationForm = () => ({
  donationDate: new Date().toISOString().slice(0, 10),
  amount: "",
  cashAccountId: "",
  purpose: "",
  beneficiary: "",
  notes: "",
});

export default function DonationForm({
  form,
  onChange,
  cashAccounts = [],
  submitting = false,
  onSubmit,
  onCancel,
}) {
  const selectedCash = cashAccounts.find((a) => String(a.id) === String(form.cashAccountId));
  const parsedAmount = parseFloat(form.amount) || 0;
  const insufficient =
    selectedCash && parsedAmount > 0 && Number(selectedCash.balance || 0) < parsedAmount;

  const setPurpose = (purpose) => onChange({ ...form, purpose });

  return (
    <form onSubmit={onSubmit} className="erp-don-form space-y-5">
      <div className="erp-don-form-banner">
        <Heart className="w-4 h-4 shrink-0" />
        <p>
          Donations are paid from <strong>cash only</strong> and post to the charitable donations expense account in the general ledger.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="erp-finance-label">Donation date</label>
          <input
            type="date"
            required
            value={form.donationDate}
            onChange={(e) => onChange({ ...form, donationDate: e.target.value })}
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
            className="erp-finance-input w-full bg-white font-mono text-lg"
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="erp-finance-label">Cash account</label>
        <select
          required
          value={form.cashAccountId}
          onChange={(e) => onChange({ ...form, cashAccountId: e.target.value })}
          className="erp-finance-input w-full bg-white"
        >
          <option value="">Select cash account...</option>
          {cashAccounts.map((a) => (
            <option key={a.id} value={String(a.id)}>
              {a.name} · {formatCurrency(a.balance || 0, false)}
            </option>
          ))}
        </select>
        {selectedCash && (
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <Wallet className="w-3 h-3" />
            Available:{" "}
            <span className="font-semibold text-slate-800">{formatCurrency(selectedCash.balance || 0)}</span>
          </p>
        )}
        {insufficient && (
          <p className="text-xs font-medium text-rose-600">Insufficient cash balance for this donation.</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="erp-finance-label">Purpose</label>
        <div className="flex flex-wrap gap-2">
          {DONATION_PURPOSES.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => setPurpose(label === "Other" ? "" : label)}
              className={`erp-don-purpose-chip ${form.purpose === label ? "is-active" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          type="text"
          required
          value={form.purpose}
          onChange={(e) => onChange({ ...form, purpose: e.target.value })}
          className="erp-finance-input w-full bg-white"
          placeholder="e.g. Zakat, Sadqa, mosque fund..."
        />
      </div>

      <div className="space-y-1.5">
        <label className="erp-finance-label">Beneficiary (optional)</label>
        <input
          type="text"
          value={form.beneficiary}
          onChange={(e) => onChange({ ...form, beneficiary: e.target.value })}
          className="erp-finance-input w-full bg-white"
          placeholder="Person, mosque, or organization name"
        />
      </div>

      <div className="space-y-1.5">
        <label className="erp-finance-label">Private notes (optional)</label>
        <textarea
          rows={2}
          value={form.notes}
          onChange={(e) => onChange({ ...form, notes: e.target.value })}
          className="erp-finance-input w-full bg-white resize-none"
          placeholder="Internal reference — not shown on ledger description"
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || insufficient} className="erp-don-btn-primary">
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Posting...
            </>
          ) : (
            <>
              <Heart className="w-4 h-4" /> Post donation
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

"use client";

import React, { useMemo } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/Button";
import PaymentSplitFields from "@/components/accounts/PaymentSplitFields";
import { formatCurrency, parseNumber } from "@/lib/formatters";

export default function ExpenseForm({
  form,
  onChange,
  categories = [],
  cashAccounts = [],
  bankAccounts = [],
  defaultCashAccountId = "",
  submitting = false,
  onSubmit,
  onCancel,
}) {
  const total = parseNumber(form.cashAmount) + parseNumber(form.bankAmount);

  const setField = (field, value) => onChange({ ...form, [field]: value });

  const paySplitChange = (field, value) => setField(field, value);

  const canSubmit = useMemo(() => {
    if (!form.expenseTitle?.trim()) return false;
    if (total <= 0) return false;
    const cash = parseNumber(form.cashAmount);
    const bank = parseNumber(form.bankAmount);
    if (cash > 0 && !form.cashAccountId && cashAccounts.length > 0) return false;
    if (bank > 0 && !form.bankAccountId && bankAccounts.length > 0) return false;
    return true;
  }, [form, total, cashAccounts.length, bankAccounts.length]);

  return (
    <form onSubmit={onSubmit} className="erp-finance-form">
      <div className="erp-finance-form-section">
        <p className="erp-finance-section-label">Expense details</p>
        <div className="erp-finance-form-grid">
          <div className="erp-finance-field erp-finance-field-span2">
            <label className="erp-finance-label">Title *</label>
            <input
              type="text"
              value={form.expenseTitle}
              onChange={(e) => setField("expenseTitle", e.target.value)}
              required
              className="erp-finance-input"
              placeholder="e.g. Office rent for July"
            />
          </div>
          <div className="erp-finance-field">
            <label className="erp-finance-label">Category</label>
            <select
              value={form.categoryId}
              onChange={(e) => setField("categoryId", e.target.value)}
              className="erp-finance-input"
            >
              <option value="">— Uncategorized —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="erp-finance-field">
            <label className="erp-finance-label">Date</label>
            <input
              type="date"
              value={form.expenseDate}
              onChange={(e) => setField("expenseDate", e.target.value)}
              className="erp-finance-input"
            />
          </div>
          <div className="erp-finance-field erp-finance-field-span2">
            <label className="erp-finance-label">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              className="erp-finance-input"
              placeholder="Optional short description"
            />
          </div>
          <div className="erp-finance-field erp-finance-field-span2">
            <label className="erp-finance-label">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              className="erp-finance-input erp-finance-textarea"
              rows={2}
              placeholder="Internal notes (optional)"
            />
          </div>
        </div>
      </div>

      <PaymentSplitFields
        cashAmount={form.cashAmount}
        bankAmount={form.bankAmount}
        cashAccountId={form.cashAccountId}
        bankAccountId={form.bankAccountId}
        onChange={paySplitChange}
        cashAccounts={cashAccounts}
        bankAccounts={bankAccounts}
        defaultCashAccountId={defaultCashAccountId}
      />

      <div className="erp-finance-total-bar">
        <span className="erp-finance-total-label">Expense total</span>
        <span className="erp-finance-total-value">{formatCurrency(total)}</span>
      </div>

      <div className="erp-finance-form-actions">
        <button type="button" onClick={onCancel} className="erp-finance-btn-ghost">
          Cancel
        </button>
        <Button type="submit" disabled={submitting || !canSubmit} className="bg-acc-accounts border-0">
          {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Save expense
        </Button>
      </div>
    </form>
  );
}

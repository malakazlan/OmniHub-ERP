"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Loader2, Plus, Trash2, BookText, Wallet } from "lucide-react";
import { Button } from "@/components/Button";
import PaymentSplitFields from "@/components/accounts/PaymentSplitFields";
import { formatCurrency, parseNumber } from "@/lib/formatters";

const emptyLine = () => ({ accountId: "", description: "", debit: "", credit: "" });
const emptyDebitLine = () => ({ accountId: "", amount: "", description: "" });

function buildPaymentSplitLines(debitLines, payment, description) {
  const lines = [];
  for (const d of debitLines) {
    const amt = parseNumber(d.amount);
    if (d.accountId && amt > 0) {
      lines.push({
        accountId: d.accountId,
        description: d.description || description,
        debit: amt,
        credit: 0,
      });
    }
  }
  const cash = parseNumber(payment.cashAmount);
  const bank = parseNumber(payment.bankAmount);
  if (cash > 0 && payment.cashAccountId) {
    lines.push({
      accountId: payment.cashAccountId,
      description: description,
      debit: 0,
      credit: cash,
    });
  }
  if (bank > 0 && payment.bankAccountId) {
    lines.push({
      accountId: payment.bankAccountId,
      description: description,
      debit: 0,
      credit: bank,
    });
  }
  return lines;
}

export default function JournalEntryForm({
  accounts = [],
  cashAccounts = [],
  bankAccounts = [],
  defaultCashAccountId = "",
  submitting = false,
  onSubmit,
  onCancel,
}) {
  const [mode, setMode] = useState("manual");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState([emptyLine(), emptyLine()]);
  const [debitLines, setDebitLines] = useState([emptyDebitLine()]);
  const [payment, setPayment] = useState({
    cashAmount: "",
    bankAmount: "",
    cashAccountId: defaultCashAccountId || "",
    bankAccountId: "",
  });

  useEffect(() => {
    if (defaultCashAccountId) {
      setPayment((p) => (p.cashAccountId ? p : { ...p, cashAccountId: defaultCashAccountId }));
    }
  }, [defaultCashAccountId]);

  const updateLine = (idx, field, value) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  };

  const updateDebitLine = (idx, field, value) => {
    setDebitLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  };

  const paymentChange = (field, value) => {
    setPayment((p) => ({ ...p, [field]: value }));
  };

  const manualDebit = lines.reduce((s, l) => s + (parseNumber(l.debit)), 0);
  const manualCredit = lines.reduce((s, l) => s + (parseNumber(l.credit)), 0);
  const manualBalanced = Math.abs(manualDebit - manualCredit) < 0.01 && manualDebit > 0;

  const debitTotal = debitLines.reduce((s, l) => s + parseNumber(l.amount), 0);
  const payTotal = parseNumber(payment.cashAmount) + parseNumber(payment.bankAmount);
  const paymentBalanced = Math.abs(debitTotal - payTotal) < 0.01 && debitTotal > 0;

  const canSubmit = useMemo(() => {
    if (!description.trim()) return false;
    if (mode === "manual") return manualBalanced;
    const cash = parseNumber(payment.cashAmount);
    const bank = parseNumber(payment.bankAmount);
    if (!paymentBalanced) return false;
    if (cash > 0 && !payment.cashAccountId) return false;
    if (bank > 0 && !payment.bankAccountId) return false;
    return debitLines.some((l) => l.accountId && parseNumber(l.amount) > 0);
  }, [mode, description, manualBalanced, paymentBalanced, payment, debitLines]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      entryDate,
      description: description.trim(),
      notes: notes.trim() || undefined,
      lines: mode === "manual"
        ? lines
        : buildPaymentSplitLines(debitLines, payment, description.trim()),
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="erp-finance-form">
      <div className="erp-journal-mode-tabs">
        <button
          type="button"
          className={`erp-journal-mode-tab${mode === "manual" ? " is-active" : ""}`}
          onClick={() => setMode("manual")}
        >
          <BookText className="w-3.5 h-3.5" />
          Manual entry
        </button>
        <button
          type="button"
          className={`erp-journal-mode-tab${mode === "payment" ? " is-active" : ""}`}
          onClick={() => setMode("payment")}
        >
          <Wallet className="w-3.5 h-3.5" />
          Payment split
        </button>
      </div>

      <div className="erp-finance-form-section">
        <p className="erp-finance-section-label">Entry header</p>
        <div className="erp-finance-form-grid">
          <div className="erp-finance-field">
            <label className="erp-finance-label">Date</label>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="erp-finance-input"
            />
          </div>
          <div className="erp-finance-field">
            <label className="erp-finance-label">Description *</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="erp-finance-input"
              placeholder="e.g. Depreciation adjustment"
            />
          </div>
          <div className="erp-finance-field erp-finance-field-span2">
            <label className="erp-finance-label">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="erp-finance-input erp-finance-textarea"
              rows={2}
            />
          </div>
        </div>
      </div>

      {mode === "manual" ? (
        <div className="erp-finance-form-section">
          <p className="erp-finance-section-label">Journal lines</p>
          <div className="erp-journal-lines-wrap">
            <table className="erp-journal-lines-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Line description</th>
                  <th className="num">Debit</th>
                  <th className="num">Credit</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={idx}>
                    <td>
                      <select
                        value={line.accountId}
                        onChange={(e) => updateLine(idx, "accountId", e.target.value)}
                        className="erp-finance-input text-xs"
                      >
                        <option value="">Select account</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => updateLine(idx, "description", e.target.value)}
                        className="erp-finance-input text-xs"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={line.debit}
                        onChange={(e) => updateLine(idx, "debit", e.target.value)}
                        className="erp-finance-input text-xs font-mono"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={line.credit}
                        onChange={(e) => updateLine(idx, "credit", e.target.value)}
                        className="erp-finance-input text-xs font-mono"
                      />
                    </td>
                    <td>
                      {lines.length > 2 && (
                        <button type="button" onClick={() => setLines((p) => p.filter((_, i) => i !== idx))} className="erp-fin-icon-btn erp-fin-icon-btn-danger">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>
                    <button type="button" onClick={() => setLines((p) => [...p, emptyLine()])} className="erp-journal-add-line">
                      + Add line
                    </button>
                  </td>
                  <td className="num erp-journal-total">{formatCurrency(manualDebit)}</td>
                  <td className="num erp-journal-total">{formatCurrency(manualCredit)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
          {!manualBalanced && (manualDebit > 0 || manualCredit > 0) && (
            <p className="erp-journal-balance-warn">Debit and credit totals must match before posting.</p>
          )}
        </div>
      ) : (
        <>
          <div className="erp-finance-form-section">
            <p className="erp-finance-section-label">Debit side (expense / receivable / etc.)</p>
            <div className="erp-journal-lines-wrap">
              <table className="erp-journal-lines-table">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Line description</th>
                    <th className="num">Debit amount</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {debitLines.map((line, idx) => (
                    <tr key={idx}>
                      <td>
                        <select
                          value={line.accountId}
                          onChange={(e) => updateDebitLine(idx, "accountId", e.target.value)}
                          className="erp-finance-input text-xs"
                        >
                          <option value="">Select account</option>
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="text"
                          value={line.description}
                          onChange={(e) => updateDebitLine(idx, "description", e.target.value)}
                          className="erp-finance-input text-xs"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={line.amount}
                          onChange={(e) => updateDebitLine(idx, "amount", e.target.value)}
                          className="erp-finance-input text-xs font-mono"
                        />
                      </td>
                      <td>
                        {debitLines.length > 1 && (
                          <button type="button" onClick={() => setDebitLines((p) => p.filter((_, i) => i !== idx))} className="erp-fin-icon-btn erp-fin-icon-btn-danger">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2}>
                      <button type="button" onClick={() => setDebitLines((p) => [...p, emptyDebitLine()])} className="erp-journal-add-line">
                        + Add debit line
                      </button>
                    </td>
                    <td className="num erp-journal-total">{formatCurrency(debitTotal)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <PaymentSplitFields
            cashAmount={payment.cashAmount}
            bankAmount={payment.bankAmount}
            cashAccountId={payment.cashAccountId}
            bankAccountId={payment.bankAccountId}
            onChange={paymentChange}
            cashAccounts={cashAccounts}
            bankAccounts={bankAccounts}
            defaultCashAccountId={defaultCashAccountId}
          />

          <div className={`erp-journal-balance-bar ${paymentBalanced ? "is-balanced" : "is-unbalanced"}`}>
            <span>Debit total: <strong>{formatCurrency(debitTotal)}</strong></span>
            <span>Payment total: <strong>{formatCurrency(payTotal)}</strong></span>
            <span>{paymentBalanced ? "Balanced ✓" : "Must balance to post"}</span>
          </div>
        </>
      )}

      <div className="erp-finance-form-actions">
        <button type="button" onClick={onCancel} className="erp-finance-btn-ghost">
          Cancel
        </button>
        <Button type="submit" disabled={submitting || !canSubmit} className="bg-acc-accounts border-0">
          {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Post entry
        </Button>
      </div>
    </form>
  );
}

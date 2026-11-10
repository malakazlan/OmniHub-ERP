"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/Button";
import SalarySlipPreview from "@/components/hr/SalarySlipPreview";
import { formatCurrency } from "@/lib/formatters";
import { computeSalarySettlement } from "@/lib/hrPayroll";
import { computeClearanceDisbursement } from "@/lib/hrClearancePayment";

export default function SalaryClearancePanel({
  preview,
  loading = false,
  form,
  onChange,
  cashAccounts = [],
  bankAccounts = [],
  defaultCashAccountId = "",
  submitting = false,
  onSubmit,
  onCancel,
  company = {},
}) {
  const [payMode, setPayMode] = useState("cash");
  const [view, setView] = useState("clearance");

  useEffect(() => {
    if (!preview || loading) return;
    const settlement = computeSalarySettlement({
      baseSalary: preview.earnings.contractSalary,
      bonus: parseFloat(form.bonus) || 0,
      commissionBonus: preview.commission,
      deductions: preview.earnings.absenceDeduction,
      pendingAdvance: preview.advances.pendingTotal,
    });
    onChange({
      ...form,
      employeeId: String(preview.employee.id),
      baseSalary: String(preview.earnings.contractSalary),
      deductions: String(preview.earnings.absenceDeduction),
      advanceDeduction: String(settlement.advanceDeduction),
      commissionBonus: String(preview.commission),
      bonus: form.bonus || "0",
      newAdvanceAmount: form.newAdvanceAmount || "0",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview?.employee?.id, preview?.period?.month, preview?.period?.year, preview?.advances?.pendingTotal, loading]);

  const settlement = useMemo(() => {
    if (!preview) return null;
    return computeSalarySettlement({
      baseSalary: preview.earnings.contractSalary,
      bonus: parseFloat(form.bonus) || 0,
      commissionBonus: preview.commission,
      deductions: preview.earnings.absenceDeduction,
      pendingAdvance: preview.advances.pendingTotal,
      advanceDeduction: form.advanceDeduction,
    });
  }, [preview, form.bonus, form.advanceDeduction]);

  const netPayable = settlement?.netSalary ?? 0;
  const pendingAfter = settlement?.pendingAfter ?? 0;
  const newAdvance = parseFloat(form.newAdvanceAmount) || 0;

  const disbursement = useMemo(
    () => computeClearanceDisbursement(netPayable, newAdvance, payMode),
    [netPayable, newAdvance, payMode]
  );

  useEffect(() => {
    if (!settlement) return;
    const d = computeClearanceDisbursement(netPayable, newAdvance, payMode);
    onChange({
      ...form,
      cashAmount: String(d.salaryCash + d.advanceCash),
      bankAmount: String(d.salaryBank + d.advanceBank),
      salaryCashAmount: String(d.salaryCash),
      salaryBankAmount: String(d.salaryBank),
      newAdvanceCash: String(d.advanceCash),
      newAdvanceBank: String(d.advanceBank),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payMode, netPayable, newAdvance]);

  useEffect(() => {
    if (defaultCashAccountId && !form.cashAccountId && payMode === "cash") {
      onChange({ ...form, cashAccountId: String(defaultCashAccountId) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultCashAccountId, payMode]);

  const recalcWithBonus = (bonusVal) => {
    if (!preview) return;
    const next = computeSalarySettlement({
      baseSalary: preview.earnings.contractSalary,
      bonus: parseFloat(bonusVal) || 0,
      commissionBonus: preview.commission,
      deductions: preview.earnings.absenceDeduction,
      pendingAdvance: preview.advances.pendingTotal,
    });
    const d = computeClearanceDisbursement(next.netSalary, newAdvance, payMode);
    onChange({
      ...form,
      bonus: bonusVal,
      advanceDeduction: String(next.advanceDeduction),
      cashAmount: String(d.salaryCash + d.advanceCash),
      bankAmount: String(d.salaryBank + d.advanceBank),
      salaryCashAmount: String(d.salaryCash),
      salaryBankAmount: String(d.salaryBank),
      newAdvanceCash: String(d.advanceCash),
      newAdvanceBank: String(d.advanceBank),
    });
  };

  const handleNewAdvance = (val) => {
    const d = computeClearanceDisbursement(netPayable, val, payMode);
    onChange({
      ...form,
      newAdvanceAmount: val,
      cashAmount: String(d.salaryCash + d.advanceCash),
      bankAmount: String(d.salaryBank + d.advanceBank),
      salaryCashAmount: String(d.salaryCash),
      salaryBankAmount: String(d.salaryBank),
      newAdvanceCash: String(d.advanceCash),
      newAdvanceBank: String(d.advanceBank),
    });
  };

  const selectedCash = cashAccounts.find((a) => String(a.id) === String(form.cashAccountId));
  const selectedBank = bankAccounts.find((a) => String(a.id) === String(form.bankAccountId));

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!preview) {
    return <p className="text-sm text-slate-500 py-8 text-center">Select an employee to process clearance.</p>;
  }

  const att = preview.attendance;
  const grossWithBonus =
    preview.earnings.basePayAfterAttendance +
    (parseFloat(form.bonus) || 0) +
    preview.commission;

  return (
    <div className="erp-sc-ref-panel">
      <header className="erp-sc-ref-header">
        <div className="erp-sc-ref-header-left">
          <button type="button" onClick={onCancel} className="erp-sc-ref-back" aria-label="Back">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <p className="erp-sc-ref-kicker">Salary clearance</p>
            <h2 className="erp-sc-ref-title">
              {preview.employee.name} · {preview.period.monthName} {preview.period.year}
            </h2>
          </div>
        </div>
        <div className="erp-sc-att-chips">
          <span className="erp-sc-chip is-present">P {att.present}</span>
          <span className="erp-sc-chip">L {att.leave}</span>
          <span className="erp-sc-chip is-absent">A {att.absent}</span>
        </div>
      </header>

      <div className="erp-sc-view-tabs">
        <button type="button" className={`erp-sc-view-tab${view === "clearance" ? " is-active" : ""}`} onClick={() => setView("clearance")}>
          Pay clearance
        </button>
        <button type="button" className={`erp-sc-view-tab${view === "slip" ? " is-active" : ""}`} onClick={() => setView("slip")}>
          Pay stub preview
        </button>
      </div>

      {view === "slip" ? (
        <SalarySlipPreview
          preview={preview}
          company={company}
          clearanceExtras={{
            newAdvanceAmount: form.newAdvanceAmount,
            bonus: form.bonus,
            paymentDate: form.paymentDate,
            notes: form.notes,
            paymentMethod: payMode,
            paymentAccountName:
              payMode === "cash" && selectedCash
                ? `Cash — ${selectedCash.name}`
                : payMode === "bank" && selectedBank
                  ? `Bank — ${selectedBank.name}`
                  : null,
            cashAmount: form.cashAmount,
            bankAmount: form.bankAmount,
            totalDisbursement: String(disbursement.totalDisbursement),
          }}
        />
      ) : (
        <form onSubmit={onSubmit} className="erp-sc-ref-body">
          <div className="erp-sc-ref-columns">
            <section className="erp-sc-ref-calc">
              <h3 className="erp-sc-ref-section-title">Pay calculation</h3>
              <table className="erp-sc-ref-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th className="is-right">Amount ($)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Monthly contract salary</td>
                    <td className="is-right font-mono">{formatCurrency(preview.earnings.contractSalary)}</td>
                  </tr>
                  <tr>
                    <td>Daily rate ({preview.period.calendarDays} days)</td>
                    <td className="is-right font-mono">{formatCurrency(preview.rates.dailyRate)}</td>
                  </tr>
                  {preview.earnings.absenceDeduction > 0 && (
                    <tr className="is-deduct">
                      <td>
                        Absence deduction
                        <span className="erp-sc-sub">
                          ({preview.attendance.chargeableAbsences} days — {preview.attendance.allowedAbsences} allowed, {preview.attendance.absent} total absent)
                        </span>
                      </td>
                      <td className="is-right font-mono text-red-700">− {formatCurrency(preview.earnings.absenceDeduction)}</td>
                    </tr>
                  )}
                  <tr>
                    <td>Base pay (after attendance)</td>
                    <td className="is-right font-mono font-semibold">{formatCurrency(preview.earnings.basePayAfterAttendance)}</td>
                  </tr>
                  <tr>
                    <td>Commission this month</td>
                    <td className="is-right font-mono">{formatCurrency(preview.commission)}</td>
                  </tr>
                  {(parseFloat(form.bonus) || 0) > 0 && (
                    <tr>
                      <td>Bonus</td>
                      <td className="is-right font-mono text-emerald-700">+ {formatCurrency(form.bonus)}</td>
                    </tr>
                  )}
                  {preview.advances.pendingTotal > 0 && (
                    <tr className="is-deduct">
                      <td>
                        Advance settlement
                        <span className="erp-sc-sub">Pending {formatCurrency(preview.advances.pendingTotal)}</span>
                      </td>
                      <td className="is-right font-mono text-amber-700">− {formatCurrency(parseFloat(form.advanceDeduction) || 0)}</td>
                    </tr>
                  )}
                  {pendingAfter > 0 && (
                    <tr className="is-deduct">
                      <td>
                        Advance still pending
                        <span className="erp-sc-sub">Not recovered from this salary</span>
                      </td>
                      <td className="is-right font-mono text-red-700">{formatCurrency(pendingAfter)}</td>
                    </tr>
                  )}
                  <tr className="is-gross">
                    <td>Gross pay</td>
                    <td className="is-right font-mono font-bold">{formatCurrency(grossWithBonus)}</td>
                  </tr>
                  <tr className="is-net">
                    <td>Net salary payable</td>
                    <td className="is-right font-mono font-bold">{formatCurrency(netPayable)}</td>
                  </tr>
                  {newAdvance > 0 && (
                    <tr className="is-advance">
                      <td>New advance (paid now)</td>
                      <td className="is-right font-mono font-bold text-sky-700">+ {formatCurrency(newAdvance)}</td>
                    </tr>
                  )}
                  <tr className="is-disburse">
                    <td>Total cash disbursement</td>
                    <td className="is-right font-mono font-bold">{formatCurrency(disbursement.totalDisbursement)}</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section className="erp-sc-ref-pay">
              <h3 className="erp-sc-ref-section-title">Payment details</h3>

              <div className="erp-finance-field">
                <label className="erp-finance-label">Payment date</label>
                <input
                  type="date"
                  value={form.paymentDate}
                  onChange={(e) => onChange({ ...form, paymentDate: e.target.value })}
                  className="erp-finance-input"
                />
              </div>

              <div className="erp-finance-field">
                <label className="erp-finance-label">Bonus (optional)</label>
                <input
                  type="number"
                  step="any"
                  value={form.bonus}
                  onChange={(e) => recalcWithBonus(e.target.value)}
                  className="erp-finance-input font-mono"
                />
                <p className="erp-sc-field-hint">Extra amount added to this month&apos;s salary — shown on receipt</p>
              </div>

              <div className="erp-finance-field">
                <label className="erp-finance-label">New advance (optional)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.newAdvanceAmount || "0"}
                  onChange={(e) => handleNewAdvance(e.target.value)}
                  className="erp-finance-input font-mono"
                />
                <p className="erp-sc-field-hint">Paid separately — recovered in a future month</p>
              </div>

              <div className="erp-sc-pay-mode">
                <div className="erp-sc-pay-mode-head">
                  <span className="erp-finance-label">Payment from account</span>
                  <span className="erp-sc-payable">Payable: {formatCurrency(disbursement.totalDisbursement)}</span>
                </div>
                <div className="erp-sc-pay-mode-btns">
                  {["cash", "bank", "split"].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={`erp-sc-pay-mode-btn${payMode === mode ? " is-active" : ""}`}
                      onClick={() => setPayMode(mode)}
                    >
                      {mode.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {(payMode === "cash" || payMode === "split") && (
                <div className="erp-finance-field">
                  {payMode === "cash" && selectedCash && (
                    <div className="erp-sc-account-pill">{selectedCash.name}</div>
                  )}
                  <label className="erp-finance-label">Cash account</label>
                  <select
                    value={form.cashAccountId}
                    onChange={(e) => onChange({ ...form, cashAccountId: e.target.value })}
                    className="erp-finance-input"
                  >
                    <option value="">Select cash account</option>
                    {cashAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  {payMode === "split" && (
                    <input
                      type="number"
                      step="any"
                      value={form.cashAmount}
                      onChange={(e) => onChange({ ...form, cashAmount: e.target.value })}
                      className="erp-finance-input font-mono mt-2"
                      placeholder="Cash amount"
                    />
                  )}
                </div>
              )}

              {(payMode === "bank" || payMode === "split") && (
                <div className="erp-finance-field">
                  {payMode === "bank" && selectedBank && (
                    <div className="erp-sc-account-pill">{selectedBank.name}</div>
                  )}
                  <label className="erp-finance-label">Bank account</label>
                  <select
                    value={form.bankAccountId}
                    onChange={(e) => onChange({ ...form, bankAccountId: e.target.value })}
                    className="erp-finance-input"
                  >
                    <option value="">Select bank account</option>
                    {bankAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  {payMode === "split" && (
                    <input
                      type="number"
                      step="any"
                      value={form.bankAmount}
                      onChange={(e) => onChange({ ...form, bankAmount: e.target.value })}
                      className="erp-finance-input font-mono mt-2"
                      placeholder="Bank amount"
                    />
                  )}
                </div>
              )}

              <div className="erp-finance-field">
                <label className="erp-finance-label">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => onChange({ ...form, notes: e.target.value })}
                  className="erp-finance-input erp-finance-textarea"
                  rows={3}
                  placeholder="Payment note..."
                />
              </div>

              <div className="erp-sc-form-actions">
                <button type="button" onClick={onCancel} className="erp-finance-btn-ghost">Cancel</button>
                <Button type="submit" disabled={submitting} className="erp-sc-submit-btn border-0 w-full">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                  Post clearance · {formatCurrency(disbursement.totalDisbursement)}
                </Button>
              </div>
            </section>
          </div>
        </form>
      )}
    </div>
  );
}

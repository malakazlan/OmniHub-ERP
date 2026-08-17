"use client";

import React, { useMemo, useEffect, useState, useRef } from "react";
import { Loader2, Wallet, CalendarCheck } from "lucide-react";
import { Button } from "@/components/Button";
import PaymentSplitFields from "@/components/accounts/PaymentSplitFields";
import { formatCurrency } from "@/lib/formatters";
import { computeSalarySettlement } from "@/lib/hrPayroll";
import { computeClearanceDisbursement } from "@/lib/hrClearancePayment";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function emptySalaryForm(defaultCashAccountId = "") {
  return {
    employeeId: "",
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
    baseSalary: "",
    deductions: "0",
    advanceDeduction: "0",
    bonus: "0",
    commissionBonus: "0",
    cashAmount: "0",
    bankAmount: "0",
    cashAccountId: defaultCashAccountId || "",
    bankAccountId: "",
    paymentDate: new Date().toISOString().slice(0, 10),
    status: "pending",
    notes: "",
    newAdvanceAmount: "0",
    salaryCashAmount: "0",
    salaryBankAmount: "0",
    newAdvanceCash: "0",
    newAdvanceBank: "0",
  };
}

function payrollPatchFromSync(sync) {
  if (!sync) return null;
  const payroll = sync.payroll || {};
  const base = payroll.baseSalary ?? sync.employee?.salary ?? 0;
  const settlement = computeSalarySettlement({
    baseSalary: base,
    commissionBonus: sync.pendingCommission ?? 0,
    deductions: payroll.deductions ?? 0,
    pendingAdvance: sync.pendingAdvance ?? 0,
  });
  return {
    baseSalary: String(base),
    deductions: String(payroll.deductions ?? 0),
    advanceDeduction: String(settlement.advanceDeduction),
    commissionBonus: String(sync.pendingCommission ?? 0),
  };
}

export default function SalaryForm({
  form,
  onChange,
  employees = [],
  cashAccounts = [],
  bankAccounts = [],
  defaultCashAccountId = "",
  submitting = false,
  onSubmit,
  onCancel,
  submitLabel = "Save salary record",
}) {
  const set = (field, value) => onChange({ ...form, [field]: value });

  const [attendanceSync, setAttendanceSync] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const lastAutoAppliedKey = useRef("");

  const syncKey = form.employeeId && form.month && form.year
    ? `${form.employeeId}-${form.month}-${form.year}`
    : "";

  useEffect(() => {
    lastAutoAppliedKey.current = "";
  }, [form.employeeId]);

  useEffect(() => {
    if (!syncKey) {
      setAttendanceSync(null);
      return;
    }
    let cancelled = false;
    setAttendanceLoading(true);
    fetch(`/api/hr/attendance/summary?employeeId=${form.employeeId}&month=${form.month}&year=${form.year}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.success) setAttendanceSync(data);
        else if (!cancelled) setAttendanceSync(null);
      })
      .catch(() => {
        if (!cancelled) setAttendanceSync(null);
      })
      .finally(() => {
        if (!cancelled) setAttendanceLoading(false);
      });
    return () => { cancelled = true; };
  }, [syncKey, form.employeeId, form.month, form.year]);

  useEffect(() => {
    if (!syncKey || attendanceLoading || !attendanceSync) return;
    if (lastAutoAppliedKey.current === syncKey) return;

    const patch = payrollPatchFromSync(attendanceSync);
    if (!patch) return;

    lastAutoAppliedKey.current = syncKey;
    onChange({ ...form, ...patch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendanceSync, attendanceLoading, syncKey]);

  const applyPayrollSync = () => {
    const patch = payrollPatchFromSync(attendanceSync);
    if (!patch) return;
    onChange({ ...form, ...patch });
  };

  const settlement = useMemo(
    () =>
      computeSalarySettlement({
        baseSalary: form.baseSalary,
        bonus: form.bonus,
        commissionBonus: form.commissionBonus,
        deductions: form.deductions,
        pendingAdvance: attendanceSync?.pendingAdvance ?? form.advanceDeduction,
        advanceDeduction: form.advanceDeduction,
      }),
    [form.baseSalary, form.bonus, form.commissionBonus, form.deductions, form.advanceDeduction, attendanceSync?.pendingAdvance]
  );

  const netSalary = settlement.netSalary;
  const pendingAfter = settlement.pendingAfter;
  const newAdvance = parseFloat(form.newAdvanceAmount) || 0;
  const totalDisbursement = computeClearanceDisbursement(netSalary, newAdvance, "cash").totalDisbursement;

  const handleNewAdvanceChange = (val) => {
    const d = computeClearanceDisbursement(netSalary, val, "cash");
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

  const paidTotal = (parseFloat(form.cashAmount) || 0) + (parseFloat(form.bankAmount) || 0);

  const handleEmployeeChange = (e) => {
    onChange({
      ...form,
      employeeId: e.target.value,
    });
  };

  return (
    <form onSubmit={onSubmit} className="erp-finance-form erp-hr-form">
      <div className="erp-finance-form-section">
        <p className="erp-finance-section-label">Payroll period</p>
        <div className="erp-finance-form-grid">
          <div className="erp-finance-field erp-finance-field-span2">
            <label className="erp-finance-label">Employee *</label>
            <select value={form.employeeId} onChange={handleEmployeeChange} required className="erp-finance-input">
              <option value="">Select employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}{emp.department ? ` · ${emp.department}` : ""} — {formatCurrency(emp.salary)}/mo
                </option>
              ))}
            </select>
          </div>
          <div className="erp-finance-field">
            <label className="erp-finance-label">Month</label>
            <select value={form.month} onChange={(e) => set("month", e.target.value)} className="erp-finance-input">
              {MONTHS.map((m, i) => (
                <option key={m} value={String(i + 1)}>{m}</option>
              ))}
            </select>
          </div>
          <div className="erp-finance-field">
            <label className="erp-finance-label">Year</label>
            <input type="number" value={form.year} onChange={(e) => set("year", e.target.value)} className="erp-finance-input font-mono" />
          </div>
        </div>
      </div>

      {form.employeeId && (
        <div className="erp-finance-form-section">
          <p className="erp-finance-section-label">Payroll sync</p>
          <div className="erp-hr-att-sync-box">
            {attendanceLoading ? (
              <p className="text-xs text-slate-500 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading attendance & advances...
              </p>
            ) : attendanceSync ? (
              <>
                {attendanceSync.summary ? (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                    <span><strong>{attendanceSync.summary.present}</strong> present</span>
                    <span><strong>{attendanceSync.summary.absent}</strong> absent</span>
                    <span><strong>{attendanceSync.summary.half_day}</strong> half day</span>
                    <span><strong>{attendanceSync.summary.leave}</strong> leave</span>
                    <span><strong>{attendanceSync.payroll?.allowedAbsences ?? 0}</strong> allowed free</span>
                    {(attendanceSync.payroll?.chargeableAbsences ?? 0) > 0 && (
                      <span className="text-red-700"><strong>{attendanceSync.payroll.chargeableAbsences}</strong> chargeable absent</span>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No attendance marked for this period.</p>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  Absence deduct {formatCurrency(attendanceSync.payroll?.deductions ?? 0)}
                  · Pending advance {formatCurrency(attendanceSync.pendingAdvance ?? 0)}
                  · Commission {formatCurrency(attendanceSync.pendingCommission ?? 0)}
                </p>
                <p className="text-xs text-emerald-700 mt-1 font-semibold">
                  Auto-applied to salary fields below
                </p>
                <button
                  type="button"
                  onClick={applyPayrollSync}
                  className="erp-hr-att-sync-btn mt-2"
                >
                  <CalendarCheck className="w-3.5 h-3.5" />
                  Re-apply sync
                </button>
              </>
            ) : (
              <p className="text-xs text-slate-500">Could not load payroll data.</p>
            )}
          </div>
        </div>
      )}

      <div className="erp-finance-form-section">
        <p className="erp-finance-section-label">Salary breakdown</p>
        <div className="erp-finance-form-grid">
          <div className="erp-finance-field">
            <label className="erp-finance-label">Base salary</label>
            <input type="number" step="any" value={form.baseSalary} onChange={(e) => set("baseSalary", e.target.value)} className="erp-finance-input font-mono" />
          </div>
          <div className="erp-finance-field">
            <label className="erp-finance-label">Bonus</label>
            <input type="number" step="any" value={form.bonus} onChange={(e) => set("bonus", e.target.value)} className="erp-finance-input font-mono" />
          </div>
          <div className="erp-finance-field">
            <label className="erp-finance-label">Deductions</label>
            <input type="number" step="any" value={form.deductions} onChange={(e) => set("deductions", e.target.value)} className="erp-finance-input font-mono" />
          </div>
          <div className="erp-finance-field">
            <label className="erp-finance-label">Advance deduction</label>
            <input type="number" step="any" value={form.advanceDeduction} onChange={(e) => set("advanceDeduction", e.target.value)} className="erp-finance-input font-mono" />
            {attendanceSync?.pendingAdvance > 0 && (
              <p className="text-[10px] text-amber-700 mt-1">
                Pending advance {formatCurrency(attendanceSync.pendingAdvance)} · Recovering {formatCurrency(settlement.advanceDeduction)}
              </p>
            )}
          </div>
          <div className="erp-finance-field">
            <label className="erp-finance-label">Commission bonus</label>
            <input type="number" step="any" value={form.commissionBonus} onChange={(e) => set("commissionBonus", e.target.value)} className="erp-finance-input font-mono" />
          </div>
          <div className="erp-finance-field">
            <label className="erp-finance-label">New advance (optional)</label>
            <input
              type="number"
              min="0"
              step="any"
              value={form.newAdvanceAmount || "0"}
              onChange={(e) => handleNewAdvanceChange(e.target.value)}
              className="erp-finance-input font-mono"
            />
            <p className="erp-sc-field-hint">Paid with salary — recovered in a future month</p>
          </div>
          <div className="erp-hr-net-box">
            <p className="erp-hr-net-label">Net salary payable</p>
            <p className="erp-hr-net-value">{formatCurrency(netSalary)}</p>
            {pendingAfter > 0 && (
              <p className="erp-hr-net-sub text-amber-700 font-semibold">
                Advance still pending: {formatCurrency(pendingAfter)}
              </p>
            )}
            {newAdvance > 0 && (
              <p className="erp-hr-net-sub text-sky-700 font-semibold">
                New advance: +{formatCurrency(newAdvance)} · Total disbursement {formatCurrency(totalDisbursement)}
              </p>
            )}
            {paidTotal > 0 && (
              <p className="erp-hr-net-sub">Paying {formatCurrency(paidTotal)}</p>
            )}
          </div>
        </div>
      </div>

      <div className="erp-finance-form-section">
        <PaymentSplitFields
          cashAmount={form.cashAmount}
          bankAmount={form.bankAmount}
          cashAccountId={form.cashAccountId}
          bankAccountId={form.bankAccountId}
          onChange={set}
          cashAccounts={cashAccounts}
          bankAccounts={bankAccounts}
          defaultCashAccountId={defaultCashAccountId}
        />
      </div>

      <div className="erp-finance-form-section">
        <p className="erp-finance-section-label">Payment status</p>
        <div className="erp-finance-form-grid">
          <div className="erp-finance-field">
            <label className="erp-finance-label">Payment date</label>
            <input type="date" value={form.paymentDate} onChange={(e) => set("paymentDate", e.target.value)} className="erp-finance-input" />
          </div>
          <div className="erp-finance-field">
            <label className="erp-finance-label">Status</label>
            <select value={form.status} onChange={(e) => set("status", e.target.value)} className="erp-finance-input">
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div className="erp-finance-field erp-finance-field-span2">
            <label className="erp-finance-label">Notes</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} className="erp-finance-input erp-finance-textarea" rows={2} />
          </div>
        </div>
      </div>

      <div className="erp-finance-form-actions">
        <button type="button" onClick={onCancel} className="erp-finance-btn-ghost">Cancel</button>
        <Button type="submit" disabled={submitting} className="bg-acc-hr border-0">
          {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wallet className="w-3.5 h-3.5" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

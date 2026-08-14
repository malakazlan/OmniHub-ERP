"use client";

import React, { useMemo } from "react";
import { Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/Button";
import PaymentSplitFields from "@/components/accounts/PaymentSplitFields";
import { formatCurrency } from "@/lib/formatters";

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
    bonus: "0",
    cashAmount: "0",
    bankAmount: "0",
    cashAccountId: defaultCashAccountId || "",
    bankAccountId: "",
    paymentDate: new Date().toISOString().slice(0, 10),
    status: "pending",
    notes: "",
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

  const netSalary = useMemo(
    () => (parseFloat(form.baseSalary) || 0) + (parseFloat(form.bonus) || 0) - (parseFloat(form.deductions) || 0),
    [form.baseSalary, form.bonus, form.deductions]
  );

  const paidTotal = (parseFloat(form.cashAmount) || 0) + (parseFloat(form.bankAmount) || 0);

  const handleEmployeeChange = (e) => {
    const empId = e.target.value;
    const emp = employees.find((em) => String(em.id) === empId);
    onChange({
      ...form,
      employeeId: empId,
      baseSalary: emp ? String(emp.salary || "") : form.baseSalary,
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
          <div className="erp-hr-net-box">
            <p className="erp-hr-net-label">Net salary</p>
            <p className="erp-hr-net-value">{formatCurrency(netSalary)}</p>
            {paidTotal > 0 && (
              <p className="erp-hr-net-sub">Paying {formatCurrency(paidTotal)} · Balance {formatCurrency(Math.max(0, netSalary - paidTotal))}</p>
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

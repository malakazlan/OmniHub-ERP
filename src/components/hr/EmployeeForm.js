"use client";

import React from "react";
import { Loader2, UserPlus, User, KeyRound } from "lucide-react";
import { Button } from "@/components/Button";
import EmployeeLoginFields, { emptyLoginFormFields } from "@/components/hr/EmployeeLoginFields";
import { loginRoleFromEmployeeRole } from "@/lib/modulePresets";

export const EMP_ROLES = ["salesperson", "driver", "accountant", "laborer", "officer", "manager"];

export function emptyEmployeeForm() {
  return {
    name: "",
    fatherName: "",
    cnic: "",
    phone: "",
    role: "",
    designation: "",
    department: "",
    salary: "",
    commissionRate: "",
    allowedAbsences: "0",
    absenceDeductionPerDay: "",
    joiningDate: new Date().toISOString().slice(0, 10),
    address: "",
    bankName: "",
    bankAccountNo: "",
    notes: "",
    isActive: true,
    ...emptyLoginFormFields("viewer"),
  };
}

export default function EmployeeForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  submitting = false,
  isEdit = false,
  hasLinkedLogin = false,
  showLoginTab = true,
  isAdmin = false,
  activeTab = "profile",
  onTabChange,
  submitLabel = "Save employee",
}) {
  const set = (field, value) => onChange({ ...form, [field]: value });

  const handleRoleChange = (role) => {
    const next = { ...form, role };
    if (!isEdit && form.createLogin) {
      next.loginRole = loginRoleFromEmployeeRole(role);
    }
    onChange(next);
  };

  return (
    <form onSubmit={onSubmit} className="erp-finance-form erp-hr-form">
      {showLoginTab && isAdmin && (
        <div className="erp-hr-form-tabs">
          <button
            type="button"
            onClick={() => onTabChange?.("profile")}
            className={`erp-hr-form-tab${activeTab === "profile" ? " is-active" : ""}`}
          >
            <User className="w-3.5 h-3.5" /> Employee profile
          </button>
          <button
            type="button"
            onClick={() => onTabChange?.("access")}
            className={`erp-hr-form-tab${activeTab === "access" ? " is-active" : ""}`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            {hasLinkedLogin ? "Login & access" : "Assign login"}
          </button>
        </div>
      )}

      {(activeTab === "profile" || !isAdmin) && (
        <>
          <div className="erp-finance-form-section">
            <p className="erp-finance-section-label">Personal information</p>
            <div className="erp-finance-form-grid">
              <div className="erp-finance-field erp-finance-field-span2">
                <label className="erp-finance-label">Full name *</label>
                <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} required className="erp-finance-input" />
              </div>
              <div className="erp-finance-field">
                <label className="erp-finance-label">Father&apos;s name</label>
                <input type="text" value={form.fatherName} onChange={(e) => set("fatherName", e.target.value)} className="erp-finance-input" />
              </div>
              <div className="erp-finance-field">
                <label className="erp-finance-label">CNIC (optional)</label>
                <input type="text" value={form.cnic} onChange={(e) => set("cnic", e.target.value)} className="erp-finance-input font-mono" placeholder="Leave blank if unknown" />
              </div>
              <div className="erp-finance-field">
                <label className="erp-finance-label">Phone *</label>
                <input type="text" value={form.phone} onChange={(e) => set("phone", e.target.value)} required className="erp-finance-input" />
              </div>
              <div className="erp-finance-field">
                <label className="erp-finance-label">Role</label>
                <select value={form.role} onChange={(e) => handleRoleChange(e.target.value)} className="erp-finance-input">
                  <option value="">Select role</option>
                  {EMP_ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="erp-finance-field erp-finance-field-span2">
                <label className="erp-finance-label">Address</label>
                <textarea value={form.address} onChange={(e) => set("address", e.target.value)} className="erp-finance-input erp-finance-textarea" rows={2} />
              </div>
            </div>
          </div>

          <div className="erp-finance-form-section">
            <p className="erp-finance-section-label">Employment & payroll</p>
            <div className="erp-finance-form-grid">
              <div className="erp-finance-field">
                <label className="erp-finance-label">Department</label>
                <input type="text" value={form.department} onChange={(e) => set("department", e.target.value)} className="erp-finance-input" />
              </div>
              <div className="erp-finance-field">
                <label className="erp-finance-label">Designation</label>
                <input type="text" value={form.designation} onChange={(e) => set("designation", e.target.value)} className="erp-finance-input" />
              </div>
              <div className="erp-finance-field">
                <label className="erp-finance-label">Monthly salary</label>
                <input type="number" step="any" value={form.salary} onChange={(e) => set("salary", e.target.value)} className="erp-finance-input font-mono" placeholder="0" />
              </div>
              <div className="erp-finance-field">
                <label className="erp-finance-label">Commission rate (%)</label>
                <input type="number" step="any" min="0" max="100" value={form.commissionRate} onChange={(e) => set("commissionRate", e.target.value)} className="erp-finance-input font-mono" placeholder="0" />
              </div>
              <div className="erp-finance-field">
                <label className="erp-finance-label">Joining date</label>
                <input type="date" value={form.joiningDate} onChange={(e) => set("joiningDate", e.target.value)} className="erp-finance-input" />
              </div>
            </div>
          </div>

          <div className="erp-finance-form-section">
            <p className="erp-finance-section-label">Attendance & absence rules</p>
            <p className="text-[11px] text-slate-500 mb-2">
              Allowed absences are free each month. Extra absent days deduct per-day amount. Half day deducts half.
            </p>
            <div className="erp-finance-form-grid">
              <div className="erp-finance-field">
                <label className="erp-finance-label">Allowed absences / month</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.allowedAbsences}
                  onChange={(e) => set("allowedAbsences", e.target.value)}
                  className="erp-finance-input font-mono"
                  placeholder="0"
                />
              </div>
              <div className="erp-finance-field">
                <label className="erp-finance-label">Deduction per absent day</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={form.absenceDeductionPerDay}
                  onChange={(e) => set("absenceDeductionPerDay", e.target.value)}
                  className="erp-finance-input font-mono"
                  placeholder="Auto: salary ÷ working days"
                />
              </div>
            </div>
          </div>

          <div className="erp-finance-form-section">
            <p className="erp-finance-section-label">Bank details</p>
            <div className="erp-finance-form-grid">
              <div className="erp-finance-field">
                <label className="erp-finance-label">Bank name</label>
                <input type="text" value={form.bankName} onChange={(e) => set("bankName", e.target.value)} className="erp-finance-input" />
              </div>
              <div className="erp-finance-field">
                <label className="erp-finance-label">Account number</label>
                <input type="text" value={form.bankAccountNo} onChange={(e) => set("bankAccountNo", e.target.value)} className="erp-finance-input font-mono" />
              </div>
              {isEdit && (
                <div className="erp-finance-field erp-finance-field-span2">
                  <label className="erp-hr-check">
                    <input type="checkbox" checked={!!form.isActive} onChange={(e) => set("isActive", e.target.checked)} />
                    Active employee
                  </label>
                </div>
              )}
              <div className="erp-finance-field erp-finance-field-span2">
                <label className="erp-finance-label">Notes</label>
                <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} className="erp-finance-input erp-finance-textarea" rows={2} />
              </div>
            </div>
          </div>

          {!isEdit && isAdmin && (
            <EmployeeLoginFields form={form} setForm={onChange} isEdit={false} hasLinkedLogin={false} />
          )}
        </>
      )}

      {isAdmin && activeTab === "access" && (
        <EmployeeLoginFields form={form} setForm={onChange} isEdit={isEdit} hasLinkedLogin={hasLinkedLogin} />
      )}

      <div className="erp-finance-form-actions">
        <button type="button" onClick={onCancel} className="erp-finance-btn-ghost">Cancel</button>
        <Button type="submit" disabled={submitting} className="bg-acc-hr border-0">
          {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

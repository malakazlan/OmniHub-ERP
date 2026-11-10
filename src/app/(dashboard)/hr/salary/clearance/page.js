"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/Button";
import SalaryClearancePanel from "@/components/hr/SalaryClearancePanel";
import { emptySalaryForm } from "@/components/hr/SalaryForm";
import { useDefaultCashAccountId } from "@/hooks/useDefaultCashAccount";
import { formatCurrency } from "@/lib/formatters";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function SalaryClearancePage() {
  const { showToast } = useToast();
  const defaultCashAccountId = useDefaultCashAccountId();
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [employees, setEmployees] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptySalaryForm());
  const [cashAccounts, setCashAccounts] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [companySettings, setCompanySettings] = useState(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, salRes, accRes] = await Promise.all([
        fetch("/api/hr/employees"),
        fetch(`/api/hr/salary?month=${month}&year=${year}`),
        fetch("/api/accounts"),
      ]);
      const empData = await empRes.json();
      const salData = await salRes.json();
      const accData = await accRes.json();
      const active = (empData.employees || []).filter((e) => e.isActive);
      setEmployees(active);

      if (accRes.ok && accData.accounts) {
        setCashAccounts(accData.accounts.filter((a) => a.category === "cash"));
        setBankAccounts(accData.accounts.filter((a) => a.category === "bank"));
      }

      const recordMap = Object.fromEntries((salData.salaryRecords || []).map((r) => [r.employeeId, r]));
      const listRows = await Promise.all(
        active.map(async (emp) => {
          const res = await fetch(
            `/api/hr/salary/preview?employeeId=${emp.id}&month=${month}&year=${year}`
          );
          const data = await res.json();
          return {
            employee: emp,
            record: recordMap[emp.id],
            preview: data.preview,
            netPayable: data.preview?.totals?.netPayable ?? emp.salary,
          };
        })
      );
      setRows(listRows);
    } catch {
      showToast("Failed to load clearance data", "error");
    } finally {
      setLoading(false);
    }
  }, [month, year, showToast]);

  const loadPreview = useCallback(async (employeeId) => {
    setPreviewLoading(true);
    try {
      const res = await fetch(
        `/api/hr/salary/preview?employeeId=${employeeId}&month=${month}&year=${year}`
      );
      const data = await res.json();
      if (res.ok) {
        setPreview(data.preview);
        setForm({
          ...emptySalaryForm(defaultCashAccountId ? String(defaultCashAccountId) : ""),
          employeeId: String(employeeId),
          month,
          year,
          paymentDate: new Date().toISOString().slice(0, 10),
          status: "paid",
          cashAccountId: defaultCashAccountId ? String(defaultCashAccountId) : "",
        });
      } else {
        showToast(data.error || "Failed to load preview", "error");
      }
    } catch {
      showToast("Error loading salary preview", "error");
    } finally {
      setPreviewLoading(false);
    }
  }, [month, year, defaultCashAccountId, showToast]);

  useEffect(() => {
    loadList();
    fetch("/api/settings").then((r) => r.json()).then((d) => {
      if (d.settings) setCompanySettings(d.settings);
    }).catch(() => {});
  }, [loadList]);

  const openClearance = (employeeId) => {
    setSelectedId(employeeId);
    loadPreview(employeeId);
  };

  const closeClearance = () => {
    setSelectedId(null);
    setPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/hr/salary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          month,
          year,
          cashAmount: form.salaryCashAmount ?? form.cashAmount,
          bankAmount: form.salaryBankAmount ?? form.bankAmount,
          paidAmount: undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Salary clearance posted", "success");
        closeClearance();
        loadList();
      } else showToast(data.error || "Failed", "error");
    } catch {
      showToast("Error posting salary", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="erp-hr-surface page-enter pb-8">
      <div className="erp-hr-page space-y-5">
        <header className="erp-hr-page-header">
          <div>
            <Link href="/hr" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-pink-700 mb-2">
              <ArrowLeft className="w-3.5 h-3.5" /> Employees & Payroll
            </Link>
            <div className="erp-hr-page-badge"><CheckCircle2 className="w-3.5 h-3.5" /> Clearance</div>
            <h1 className="erp-hr-page-title">Salary clearance</h1>
            <p className="erp-hr-page-desc">
              Attendance-based pay calculation, advance settlement, and cash disbursement — same flow as pay stub preview.
            </p>
          </div>
        </header>

        <div className="erp-hr-filter-bar">
          <div className="erp-hr-filter-field">
            <label>Month</label>
            <select value={month} onChange={(e) => { setMonth(e.target.value); closeClearance(); }} className="erp-finance-input">
              {MONTHS.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
            </select>
          </div>
          <div className="erp-hr-filter-field">
            <label>Year</label>
            <input type="number" value={year} onChange={(e) => { setYear(e.target.value); closeClearance(); }} className="erp-finance-input w-28 font-mono" />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <div className={`${selectedId ? "xl:col-span-4" : "xl:col-span-12"} space-y-3`}>
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
              {loading ? (
                <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
              ) : (
                <table className="w-full text-sm min-w-[640px]">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-2">Employee</th>
                      <th className="px-4 py-2 text-center">P</th>
                      <th className="px-4 py-2 text-center">A</th>
                      <th className="px-4 py-2 text-right">Net pay</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row) => (
                      <tr key={row.employee.id} className={selectedId === row.employee.id ? "bg-pink-50/60" : ""}>
                        <td className="px-4 py-2 font-semibold">{row.employee.name}</td>
                        <td className="px-4 py-2 text-center font-mono text-emerald-700">{row.preview?.attendance?.present ?? "—"}</td>
                        <td className="px-4 py-2 text-center font-mono text-red-700">{row.preview?.attendance?.absent ?? "—"}</td>
                        <td className="px-4 py-2 text-right font-mono font-bold">{formatCurrency(row.netPayable)}</td>
                        <td className="px-4 py-2 capitalize text-xs">{row.record?.status || "missing"}</td>
                        <td className="px-4 py-2">
                          <Button
                            size="sm"
                            onClick={() => openClearance(row.employee.id)}
                            className={`border-0 text-xs${selectedId === row.employee.id ? " bg-slate-800" : " bg-acc-hr"}`}
                          >
                            {selectedId === row.employee.id ? "Selected" : "Clear pay"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {selectedId && (
            <div className="xl:col-span-8">
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 md:p-5 erp-sc-ref-wrap">
                <SalaryClearancePanel
                  preview={preview}
                  loading={previewLoading}
                  form={form}
                  onChange={setForm}
                  cashAccounts={cashAccounts}
                  bankAccounts={bankAccounts}
                  defaultCashAccountId={defaultCashAccountId ? String(defaultCashAccountId) : ""}
                  submitting={submitting}
                  onSubmit={handleSubmit}
                  onCancel={closeClearance}
                  company={companySettings}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

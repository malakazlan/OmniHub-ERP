"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { PageHeader, StatCard } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/Button";
import { Wallet, Loader2, ArrowLeft, Plus, DollarSign } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { useDefaultCashAccountId } from "@/hooks/useDefaultCashAccount";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const emptyForm = {
  employeeId: "",
  month: String(new Date().getMonth() + 1),
  year: String(new Date().getFullYear()),
  baseSalary: "",
  deductions: "0",
  bonus: "0",
  cashAmount: "0",
  bankAmount: "0",
  cashAccountId: "",
  bankAccountId: "",
  paymentDate: "",
  paymentMethod: "cash",
  status: "pending",
  notes: "",
};

export default function SalaryPage() {
  const { showToast } = useToast();
  const defaultCashAccountId = useDefaultCashAccountId();
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchSalary = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hr/salary?month=${month}&year=${year}`);
      const data = await res.json();
      if (res.ok) {
        setRecords(data.salaryRecords || []);
        setEmployees(data.employees || []);
      } else showToast(data.error || "Failed to load salary records", "error");
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  useEffect(() => {
    async function loadAccounts() {
      try {
        const res = await fetch("/api/accounts");
        const data = await res.json();
        if (res.ok) {
          setCashAccounts((data.accounts || []).filter((a) => a.category === "cash"));
          setBankAccounts((data.accounts || []).filter((a) => a.category === "bank"));
        }
      } catch {
        /* ignore */
      }
    }
    loadAccounts();
  }, []);

  const handleChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
  };

  const openCreate = () => {
    setForm({
      ...emptyForm,
      month,
      year,
      cashAccountId: defaultCashAccountId || "",
    });
    setModalOpen(true);
  };

  const handleEmployeeSelect = (e) => {
    const empId = e.target.value;
    const emp = employees.find((em) => String(em.id) === empId);
    setForm({
      ...form,
      employeeId: empId,
      baseSalary: emp ? String(emp.salary || "") : "",
    });
  };

  const netPreview =
    (parseFloat(form.baseSalary) || 0) +
    (parseFloat(form.bonus) || 0) -
    (parseFloat(form.deductions) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employeeId) {
      showToast("Select an employee", "warning");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/hr/salary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Salary record saved!", "success");
        setModalOpen(false);
        fetchSalary();
      } else showToast(data.error || "Failed to save salary", "error");
    } catch {
      showToast("Error processing request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const totalNet = records.reduce((s, r) => s + (r.netSalary || 0), 0);
  const totalPaid = records.reduce((s, r) => s + (r.paidAmount || 0), 0);
  const pendingCount = records.filter((r) => r.status === "pending").length;

  const columns = [
    {
      header: "Employee",
      accessor: "employeeId",
      cell: (row) => (
        <p className="font-semibold text-slate-900">{row.employee?.name || "—"}</p>
      ),
    },
    {
      header: "Period",
      accessor: "month",
      cell: (row) => (
        <span className="text-xs text-slate-600">
          {MONTHS[row.month - 1]} {row.year}
        </span>
      ),
    },
    {
      header: "Base",
      accessor: "baseSalary",
      cell: (row) => (
        <span className="font-mono text-xs text-slate-600">{formatCurrency(row.baseSalary)}</span>
      ),
    },
    {
      header: "Net",
      accessor: "netSalary",
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-acc-hr">
          {formatCurrency(row.netSalary)}
        </span>
      ),
    },
    {
      header: "Paid",
      accessor: "paidAmount",
      cell: (row) => (
        <span className="font-mono text-xs text-slate-600">{formatCurrency(row.paidAmount)}</span>
      ),
    },
    {
      header: "Status",
      accessor: "status",
      cell: (row) => (
        <Badge variant={row.status === "paid" ? "success" : "warning"}>
          {row.status}
        </Badge>
      ),
    },
    {
      header: "Payment Date",
      accessor: "paymentDate",
      cell: (row) => (
        <span className="text-xs text-slate-500">{formatDate(row.paymentDate)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-8 page-enter">
      <PageHeader
        module="hr"
        title="Salary Records"
        description="Process monthly payroll and track payments."
        icon={Wallet}
        breadcrumbs={[
          { label: "HR", href: "/hr" },
          { label: "Salary" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/hr">
              <Button variant="outline" className="border-slate-200 text-slate-600">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            </Link>
            <Button
              onClick={openCreate}
              className="bg-acc-hr hover:bg-pink-600 border-0"
            >
              <Plus className="w-4 h-4" /> Add Record
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Month
          </label>
          <select value={month} onChange={(e) => setMonth(e.target.value)} className="input-field">
            {MONTHS.map((m, i) => (
              <option key={m} value={String(i + 1)}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Year
          </label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="input-field w-28"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard module="hr" label="Total Net" value={formatCurrency(totalNet)} icon={DollarSign} />
        <StatCard module="hr" label="Total Paid" value={formatCurrency(totalPaid)} icon={Wallet} />
        <StatCard module="hr" label="Pending" value={pendingCount} icon={Wallet} />
      </div>

      <Card>
        <CardContent>
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-acc-hr animate-spin" />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={records}
              searchKey="employeeId"
              placeholder="Search..."
            />
          )}
        </CardContent>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Salary Record" size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Employee *
              </label>
              <select
                value={form.employeeId}
                onChange={handleEmployeeSelect}
                required
                className="input-field"
              >
                <option value="">— Select —</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({formatCurrency(emp.salary)}/mo)
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Month
              </label>
              <select value={form.month} onChange={handleChange("month")} className="input-field">
                {MONTHS.map((m, i) => (
                  <option key={m} value={String(i + 1)}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Year
              </label>
              <input
                type="number"
                value={form.year}
                onChange={handleChange("year")}
                className="input-field"
              />
            </div>
            {[
              ["baseSalary", "Base Salary"],
              ["bonus", "Bonus"],
              ["deductions", "Deductions"],
            ].map(([key, label]) => (
              <div key={key} className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {label}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form[key]}
                  onChange={handleChange(key)}
                  className="input-field"
                />
              </div>
            ))}
            <div className="p-3 rounded-xl bg-pink-50 border border-pink-100">
              <p className="text-xs text-slate-500">Net Salary</p>
              <p className="text-xl font-black font-mono text-acc-hr">
                ₨ {netPreview.toLocaleString("en-PK")}
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Cash Amount Paid</label>
              <input
                type="number"
                min="0"
                step="any"
                value={form.cashAmount}
                onChange={handleChange("cashAmount")}
                className="input-field"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Cash Account</label>
              <select value={form.cashAccountId} onChange={handleChange("cashAccountId")} className="input-field">
                <option value="">— None —</option>
                {cashAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Bank Amount Paid</label>
              <input
                type="number"
                min="0"
                step="any"
                value={form.bankAmount}
                onChange={handleChange("bankAmount")}
                className="input-field"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Bank Account</label>
              <select value={form.bankAccountId} onChange={handleChange("bankAccountId")} className="input-field">
                <option value="">— None —</option>
                {bankAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Payment Date
              </label>
              <input
                type="date"
                value={form.paymentDate}
                onChange={handleChange("paymentDate")}
                className="input-field"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Status
              </label>
              <select value={form.status} onChange={handleChange("status")} className="input-field">
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Notes
              </label>
              <textarea
                value={form.notes}
                onChange={handleChange("notes")}
                className="input-field h-16 resize-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 border border-slate-200 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <Button type="submit" disabled={submitting} className="bg-acc-hr hover:bg-pink-600 border-0">
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                </>
              ) : (
                "Save Record"
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

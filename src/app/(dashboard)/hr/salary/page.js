"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/Button";
import SalaryForm, { emptySalaryForm } from "@/components/hr/SalaryForm";
import SalaryRegister from "@/components/hr/SalaryRegister";
import SalarySlipPrintView from "@/components/hr/SalarySlipPrintView";
import RegisterExportToolbar from "@/components/reports/RegisterExportToolbar";
import RegisterPrintView from "@/components/reports/RegisterPrintView";
import { useRegisterExport } from "@/hooks/useRegisterExport";
import { useSalarySlipExport } from "@/hooks/useSalarySlipExport";
import { useReactToPrint } from "react-to-print";
import {
  Wallet, Loader2, ArrowLeft, Plus, DollarSign, Users, Search,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { useDefaultCashAccountId } from "@/hooks/useDefaultCashAccount";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const SALARY_PRINT_COLS = [
  { key: "emp", label: "Employee", get: (r) => r.employee?.name || "—", pdfWidth: 36 },
  { key: "period", label: "Period", get: (r) => `${MONTHS[(r.month || 1) - 1]?.slice(0, 3)} ${r.year}`, pdfWidth: 20 },
  { key: "base", label: "Base", align: "right", get: (r) => formatCurrency(r.baseSalary), pdfWidth: 22 },
  { key: "bonus", label: "Bonus", align: "right", get: (r) => formatCurrency(r.bonus), pdfWidth: 20 },
  { key: "ded", label: "Deduct.", align: "right", get: (r) => formatCurrency(r.deductions), pdfWidth: 20 },
  { key: "net", label: "Net", align: "right", get: (r) => formatCurrency(r.netSalary), pdfWidth: 24, bold: true },
  { key: "paid", label: "Paid", align: "right", get: (r) => formatCurrency(r.paidAmount), pdfWidth: 22 },
  { key: "status", label: "Status", get: (r) => r.status, pdfWidth: 16 },
];

export default function SalaryPage() {
  const { showToast } = useToast();
  const defaultCashAccountId = useDefaultCashAccountId();
  const printRef = useRef(null);
  const slipPrintRef = useRef(null);

  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptySalaryForm());
  const [searchQuery, setSearchQuery] = useState("");
  const [companySettings, setCompanySettings] = useState(null);
  const [slipRecord, setSlipRecord] = useState(null);

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
    fetch("/api/settings").then((r) => r.json()).then((d) => { if (d.settings) setCompanySettings(d.settings); }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((d) => {
        if (d.accounts) {
          setCashAccounts(d.accounts.filter((a) => a.category === "cash"));
          setBankAccounts(d.accounts.filter((a) => a.category === "bank"));
        }
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return records;
    return records.filter((r) => r.employee?.name?.toLowerCase().includes(q));
  }, [records, searchQuery]);

  const totalNet = filtered.reduce((s, r) => s + (r.netSalary || 0), 0);
  const totalPaid = filtered.reduce((s, r) => s + (r.paidAmount || 0), 0);
  const pendingCount = filtered.filter((r) => r.status === "pending").length;

  const { pdfLoading, onPrint, onExportPdf } = useRegisterExport({
    printRef,
    title: "Salary Register",
    subtitle: `${MONTHS[parseInt(month, 10) - 1]} ${year} · ${filtered.length} records`,
    company: companySettings,
    columns: SALARY_PRINT_COLS,
    rows: filtered,
    footers: [{
      label: "Total net",
      value: formatCurrency(totalNet),
      valueColumn: "net",
      labelColumn: "paid",
    }],
    filename: `salary-${year}-${month}.pdf`,
  });

  const { pdfLoadingId, onPdfSlip } = useSalarySlipExport({ printRef: slipPrintRef, company: companySettings });

  const printSlip = useReactToPrint({
    contentRef: slipPrintRef,
    documentTitle: slipRecord ? `salary-slip-${slipRecord.id}` : "salary-slip",
    pageStyle: `@page { size: A4 portrait; margin: 10mm; }`,
  });

  const onPrintSlip = (record) => {
    setSlipRecord(record);
    setTimeout(() => printSlip(), 80);
  };

  const openCreate = () => {
    setForm(emptySalaryForm(defaultCashAccountId));
    setModalOpen(true);
  };

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

  return (
    <div className="erp-hr-surface page-enter pb-8">
      <div className="erp-hr-page space-y-5">
        <header className="erp-hr-page-header">
          <div>
            <div className="erp-hr-page-badge">
              <Wallet className="w-3.5 h-3.5" />
              Payroll
            </div>
            <h1 className="erp-hr-page-title">Salary register</h1>
            <p className="erp-hr-page-desc">Process monthly payroll, record payments, and print salary slips.</p>
          </div>
          <div className="erp-hr-header-actions">
            <Link href="/hr">
              <Button variant="outline" className="border-slate-200 text-slate-600">
                <ArrowLeft className="w-4 h-4" /> HR
              </Button>
            </Link>
            <Button onClick={openCreate} className="bg-acc-hr border-0">
              <Plus className="w-4 h-4" /> Process salary
            </Button>
          </div>
        </header>

        <div className="erp-hr-filter-bar">
          <div className="erp-hr-filter-field">
            <label>Month</label>
            <select value={month} onChange={(e) => setMonth(e.target.value)} className="erp-finance-input">
              {MONTHS.map((m, i) => (
                <option key={m} value={String(i + 1)}>{m}</option>
              ))}
            </select>
          </div>
          <div className="erp-hr-filter-field">
            <label>Year</label>
            <input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="erp-finance-input w-28 font-mono" />
          </div>
        </div>

        <div className="erp-hr-stats">
          <div className="erp-hr-stat">
            <div className="erp-hr-stat-icon"><DollarSign className="w-4 h-4" /></div>
            <div>
              <p className="erp-hr-stat-label">Total net</p>
              <p className="erp-hr-stat-value">{formatCurrency(totalNet)}</p>
            </div>
          </div>
          <div className="erp-hr-stat">
            <div className="erp-hr-stat-icon"><Wallet className="w-4 h-4" /></div>
            <div>
              <p className="erp-hr-stat-label">Total paid</p>
              <p className="erp-hr-stat-value">{formatCurrency(totalPaid)}</p>
            </div>
          </div>
          <div className="erp-hr-stat">
            <div className="erp-hr-stat-icon"><Users className="w-4 h-4" /></div>
            <div>
              <p className="erp-hr-stat-label">Pending</p>
              <p className="erp-hr-stat-value">{pendingCount}</p>
            </div>
          </div>
        </div>

        <div className="erp-hr-toolbar">
          <div className="erp-hr-search-wrap">
            <Search className="erp-hr-search-icon" />
            <input
              type="text"
              placeholder="Search employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="erp-hr-register">
          <div className="erp-hr-register-head">
            <div>
              <p className="erp-hr-register-title">
                {MONTHS[parseInt(month, 10) - 1]} {year} payroll
              </p>
              <p className="erp-hr-register-meta">{filtered.length} record{filtered.length === 1 ? "" : "s"}</p>
            </div>
            <RegisterExportToolbar
              onPrint={onPrint}
              onExportPdf={onExportPdf}
              pdfLoading={pdfLoading}
              disabled={filtered.length === 0}
              resultCount={filtered.length}
              label="records"
            />
          </div>

          <SalaryRegister
            rows={filtered}
            loading={loading}
            onPrintSlip={onPrintSlip}
            onPdfSlip={onPdfSlip}
            pdfLoadingId={pdfLoadingId}
          />
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Process salary" size="lg">
        <SalaryForm
          form={form}
          onChange={setForm}
          employees={employees}
          cashAccounts={cashAccounts}
          bankAccounts={bankAccounts}
          defaultCashAccountId={defaultCashAccountId}
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>

      <div className="erp-register-print-host" aria-hidden>
        <RegisterPrintView
          ref={printRef}
          title="Salary Register"
          subtitle={`${MONTHS[parseInt(month, 10) - 1]} ${year}`}
          company={companySettings}
          columns={SALARY_PRINT_COLS}
          rows={filtered}
          footers={[{
            label: "Total net",
            value: formatCurrency(totalNet),
            valueColumn: "net",
            labelColumn: "paid",
          }]}
        />
      </div>

      <div className="erp-salary-slip-print-host" aria-hidden>
        {slipRecord && (
          <SalarySlipPrintView ref={slipPrintRef} record={slipRecord} company={companySettings} />
        )}
      </div>
    </div>
  );
}

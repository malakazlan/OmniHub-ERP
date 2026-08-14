"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/Button";
import EmployeesRegister from "@/components/hr/EmployeesRegister";
import EmployeeForm, { emptyEmployeeForm } from "@/components/hr/EmployeeForm";
import RegisterExportToolbar from "@/components/reports/RegisterExportToolbar";
import RegisterPrintView from "@/components/reports/RegisterPrintView";
import { useRegisterExport } from "@/hooks/useRegisterExport";
import {
  Users, Loader2, UserPlus, DollarSign, CalendarCheck, Wallet, Search, ShieldCheck,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

const PRINT_COLS = [
  { key: "name", label: "Employee", get: (r) => r.name, pdfWidth: 40 },
  { key: "role", label: "Role", get: (r) => r.role || "—", pdfWidth: 22 },
  { key: "dept", label: "Department", get: (r) => r.department || "—", pdfWidth: 28 },
  { key: "phone", label: "Phone", get: (r) => r.phone || "—", pdfWidth: 24 },
  { key: "salary", label: "Salary", align: "right", get: (r) => formatCurrency(r.salary), pdfWidth: 26 },
  { key: "joined", label: "Joined", get: (r) => formatDate(r.joiningDate), pdfWidth: 24 },
  { key: "login", label: "Login", get: (r) => (r.userId ? "Yes" : "No"), pdfWidth: 14 },
  { key: "status", label: "Status", get: (r) => (r.isActive ? "Active" : "Inactive"), pdfWidth: 18 },
];

export default function HRPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  const printRef = useRef(null);
  const isAdmin = user?.role === "admin";

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyEmployeeForm());
  const [formTab, setFormTab] = useState("profile");
  const [companySettings, setCompanySettings] = useState(null);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hr/employees");
      const data = await res.json();
      if (res.ok) setEmployees(data.employees || []);
      else showToast(data.error || "Failed to load employees", "error");
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchEmployees();
    fetch("/api/settings").then((r) => r.json()).then((d) => { if (d.settings) setCompanySettings(d.settings); }).catch(() => {});
  }, [fetchEmployees]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.name?.toLowerCase().includes(q) ||
        e.phone?.toLowerCase().includes(q) ||
        e.department?.toLowerCase().includes(q) ||
        e.role?.toLowerCase().includes(q) ||
        e.designation?.toLowerCase().includes(q)
    );
  }, [employees, searchQuery]);

  const activeCount = employees.filter((e) => e.isActive).length;
  const loginCount = employees.filter((e) => e.userId).length;
  const totalPayroll = employees.reduce((s, e) => s + (e.salary || 0), 0);

  const { pdfLoading, onPrint, onExportPdf } = useRegisterExport({
    printRef,
    title: "Employee Register",
    subtitle: `${filtered.length} staff · ${formatCurrency(totalPayroll)} monthly payroll`,
    company: companySettings,
    columns: PRINT_COLS,
    rows: filtered,
    footers: [{
      label: "Monthly payroll total",
      value: formatCurrency(totalPayroll),
      valueColumn: "salary",
      labelColumn: "joined",
    }],
    filename: `employees-${new Date().toISOString().slice(0, 10)}.pdf`,
  });

  const openCreate = () => {
    setForm(emptyEmployeeForm());
    setFormTab("profile");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name?.trim() || !form.phone?.trim()) {
      showToast("Name and phone are required", "warning");
      return;
    }
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (!isAdmin) {
        delete payload.createLogin;
        delete payload.loginEmail;
        delete payload.loginPassword;
        delete payload.loginRole;
        delete payload.allowedModules;
      }
      const res = await fetch("/api/hr/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Employee ${data.employee?.name || ""} registered!`, "success");
        setModalOpen(false);
        fetchEmployees();
      } else showToast(data.error || "Failed to create employee", "error");
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
              <Users className="w-3.5 h-3.5" />
              Human resources
            </div>
            <h1 className="erp-hr-page-title">Employee register</h1>
            <p className="erp-hr-page-desc">
              Manage staff profiles, payroll, attendance, and optional portal login access.
            </p>
          </div>
          <div className="erp-hr-header-actions">
            <Link href="/hr/attendance">
              <Button variant="outline" className="border-pink-200 text-acc-hr">
                <CalendarCheck className="w-4 h-4" /> Attendance
              </Button>
            </Link>
            <Link href="/hr/salary">
              <Button variant="outline" className="border-pink-200 text-acc-hr">
                <Wallet className="w-4 h-4" /> Salary
              </Button>
            </Link>
            <Button onClick={openCreate} className="bg-acc-hr border-0">
              <UserPlus className="w-4 h-4" /> Add employee
            </Button>
          </div>
        </header>

        <div className="erp-hr-stats">
          <div className="erp-hr-stat">
            <div className="erp-hr-stat-icon"><Users className="w-4 h-4" /></div>
            <div>
              <p className="erp-hr-stat-label">Total staff</p>
              <p className="erp-hr-stat-value">{employees.length}</p>
            </div>
          </div>
          <div className="erp-hr-stat">
            <div className="erp-hr-stat-icon"><UserPlus className="w-4 h-4" /></div>
            <div>
              <p className="erp-hr-stat-label">Active</p>
              <p className="erp-hr-stat-value">{activeCount}</p>
            </div>
          </div>
          <div className="erp-hr-stat">
            <div className="erp-hr-stat-icon"><ShieldCheck className="w-4 h-4" /></div>
            <div>
              <p className="erp-hr-stat-label">With login</p>
              <p className="erp-hr-stat-value">{loginCount}</p>
            </div>
          </div>
          <div className="erp-hr-stat">
            <div className="erp-hr-stat-icon"><DollarSign className="w-4 h-4" /></div>
            <div>
              <p className="erp-hr-stat-label">Monthly payroll</p>
              <p className="erp-hr-stat-value">{formatCurrency(totalPayroll)}</p>
            </div>
          </div>
        </div>

        <div className="erp-hr-toolbar">
          <div className="erp-hr-search-wrap">
            <Search className="erp-hr-search-icon" />
            <input
              type="text"
              placeholder="Search name, phone, department, role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="erp-hr-register">
          <div className="erp-hr-register-head">
            <div>
              <p className="erp-hr-register-title">Staff directory</p>
              <p className="erp-hr-register-meta">
                {filtered.length} employee{filtered.length === 1 ? "" : "s"}
                {searchQuery ? ` · “${searchQuery}”` : ""}
              </p>
            </div>
            <RegisterExportToolbar
              onPrint={onPrint}
              onExportPdf={onExportPdf}
              pdfLoading={pdfLoading}
              disabled={filtered.length === 0}
              resultCount={filtered.length}
              label="employees"
            />
          </div>

          <EmployeesRegister
            rows={filtered}
            loading={loading}
            onRowClick={(row) => router.push(`/hr/${row.id}`)}
          />
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Register employee" size="lg">
        <EmployeeForm
          form={form}
          onChange={setForm}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
          submitting={submitting}
          isAdmin={isAdmin}
          activeTab={formTab}
          onTabChange={setFormTab}
          showLoginTab={isAdmin}
          submitLabel="Register employee"
        />
      </Modal>

      <div className="erp-register-print-host" aria-hidden>
        <RegisterPrintView
          ref={printRef}
          title="Employee Register"
          subtitle={`${filtered.length} staff`}
          company={companySettings}
          columns={PRINT_COLS}
          rows={filtered}
          footers={[{
            label: "Monthly payroll total",
            value: formatCurrency(totalPayroll),
            valueColumn: "salary",
            labelColumn: "joined",
          }]}
        />
      </div>
    </div>
  );
}

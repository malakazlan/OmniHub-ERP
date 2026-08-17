"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/Button";
import EmployeeForm from "@/components/hr/EmployeeForm";
import { loginFormFromUser } from "@/components/hr/EmployeeLoginFields";
import {
  Users, Loader2, ArrowLeft, Pencil, Trash2, Phone, Wallet,
  CalendarCheck, DollarSign, ShieldCheck, ShieldOff, KeyRound,
} from "lucide-react";
import { MODULE_ACCENTS } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/formatters";

const ATTENDANCE_VARIANTS = { present: "success", absent: "danger", half_day: "warning", leave: "info", holiday: "neutral" };
const MONTH_NAMES = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(null);
  const [editTab, setEditTab] = useState("profile");

  const fetchEmployee = async () => {
    try {
      const res = await fetch(`/api/hr/employees/${id}`);
      const data = await res.json();
      if (res.ok) setEmployee(data.employee);
      else showToast(data.error || "Failed to load employee", "error");
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchEmployee();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const openEdit = () => {
    setForm({
      name: employee.name || "",
      fatherName: employee.fatherName || "",
      cnic: employee.cnic || "",
      phone: employee.phone || "",
      role: employee.role || "",
      designation: employee.designation || "",
      department: employee.department || "",
      salary: employee.salary ?? "",
      commissionRate: employee.commissionRate ?? "",
      allowedAbsences: employee.allowedAbsences ?? 0,
      absenceDeductionPerDay: employee.absenceDeductionPerDay ?? "",
      joiningDate: employee.joiningDate ? String(employee.joiningDate).slice(0, 10) : "",
      address: employee.address || "",
      bankName: employee.bankName || "",
      bankAccountNo: employee.bankAccountNo || "",
      notes: employee.notes || "",
      isActive: employee.isActive,
      ...loginFormFromUser(employee.loginUser),
    });
    setEditTab(employee.loginUser ? "access" : "profile");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (!isAdmin) {
        delete payload.loginEmail;
        delete payload.loginPassword;
        delete payload.loginRole;
        delete payload.allowedModules;
        delete payload.loginIsActive;
        delete payload.createLogin;
      }
      const res = await fetch(`/api/hr/employees/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Employee updated!", "success");
        setModalOpen(false);
        fetchEmployee();
      } else showToast(data.error || "Failed to update employee", "error");
    } catch {
      showToast("Error processing request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete employee "${employee.name}"?`)) return;
    try {
      const res = await fetch(`/api/hr/employees/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast("Employee deleted", "success");
        router.push("/hr");
      } else showToast(data.error || "Failed to delete employee", "error");
    } catch {
      showToast("Error processing request", "error");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center erp-hr-surface">
        <Loader2 className="w-8 h-8 text-pink-600 animate-spin" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="erp-hr-surface p-8 text-center">
        <p className="text-slate-500 mb-4">Employee not found</p>
        <Link href="/hr"><Button variant="outline"><ArrowLeft className="w-4 h-4" /> Back</Button></Link>
      </div>
    );
  }

  const presentCount = (employee.attendance || []).filter((a) => a.status === "present").length;
  const hasLogin = !!employee.loginUser;

  return (
    <div className="erp-hr-surface page-enter pb-8">
      <div className="erp-hr-page space-y-5">
        <Link href="/hr" className="erp-ac-back-link"><ArrowLeft className="w-3.5 h-3.5" /> HR</Link>

        <div className="erp-hr-detail-panel">
          <div className="erp-hr-detail-head">
            <div>
              <h1 className="erp-hr-page-title">{employee.name}</h1>
              <div className="erp-hr-detail-meta">
                <span className="capitalize">{employee.role || "Staff"}</span>
                {employee.designation && <span>{employee.designation}</span>}
                {employee.department && <span>{employee.department}</span>}
                <span className={employee.isActive ? "text-emerald-700" : "text-slate-500"}>
                  {employee.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
            <div className="erp-hr-detail-actions">
              <Button variant="outline" onClick={openEdit} className="border-slate-200">
                <Pencil className="w-4 h-4" /> Edit
              </Button>
              {isAdmin && (
                <Button variant="outline" onClick={handleDelete} className="border-red-200 text-red-600">
                  <Trash2 className="w-4 h-4" /> Delete
                </Button>
              )}
            </div>
          </div>

          <div className="erp-hr-stats erp-hr-stats-inline">
            <div className="erp-hr-stat"><p className="erp-hr-stat-label">Salary</p><p className="erp-hr-stat-value">{formatCurrency(employee.salary)}</p></div>
            <div className="erp-hr-stat"><p className="erp-hr-stat-label">Present days</p><p className="erp-hr-stat-value">{presentCount}</p></div>
            <div className="erp-hr-stat"><p className="erp-hr-stat-label">Salary records</p><p className="erp-hr-stat-value">{(employee.salaryRecords || []).length}</p></div>
            <div className="erp-hr-stat"><p className="erp-hr-stat-label">Joined</p><p className="erp-hr-stat-value text-sm">{formatDate(employee.joiningDate)}</p></div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 space-y-5">
            <div className="erp-hr-register">
              <div className="erp-hr-register-head">
                <p className="erp-hr-register-title flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-pink-600" /> Recent attendance
                </p>
              </div>
              {(employee.attendance || []).length === 0 ? (
                <div className="erp-ac-empty py-10 text-sm text-slate-500">No attendance recorded yet.</div>
              ) : (
                <div className="erp-accounts-grid-wrap">
                  <table className="erp-ledger-grid erp-hr-grid">
                    <thead>
                      <tr>
                        <th className="erp-lg-th erp-hr-th">Date</th>
                        <th className="erp-hr-th erp-lg-th">Status</th>
                        <th className="erp-hr-th erp-lg-th">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employee.attendance.map((a) => (
                        <tr key={a.id} className="erp-lg-row">
                          <td className="erp-lg-td erp-lg-td-date">{formatDate(a.date)}</td>
                          <td className="erp-lg-td">
                            <span className={`erp-hr-status-pill erp-hr-att-${a.status}`}>{a.status.replace("_", " ")}</span>
                          </td>
                          <td className="erp-lg-td text-xs text-slate-500">{a.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="erp-hr-register">
              <div className="erp-hr-register-head">
                <p className="erp-hr-register-title flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-pink-600" /> Salary history
                </p>
                <Link href="/hr/salary"><Button variant="outline" className="border-pink-200 text-acc-hr text-xs">Process salary</Button></Link>
              </div>
              {(employee.salaryRecords || []).length === 0 ? (
                <div className="erp-ac-empty py-10 text-sm text-slate-500">No salary records yet.</div>
              ) : (
                <div className="erp-accounts-grid-wrap">
                  <table className="erp-ledger-grid erp-hr-grid">
                    <thead>
                      <tr>
                        <th className="erp-lg-th erp-hr-th">Period</th>
                        <th className="erp-lg-th erp-hr-th erp-lg-th-money">Net</th>
                        <th className="erp-lg-th erp-hr-th erp-lg-th-money">Paid</th>
                        <th className="erp-lg-th erp-hr-th">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employee.salaryRecords.map((s) => (
                        <tr key={s.id} className="erp-lg-row">
                          <td className="erp-lg-td font-semibold text-sm">{MONTH_NAMES[s.month]} {s.year}</td>
                          <td className="erp-lg-td erp-lg-td-money font-bold text-pink-700">{formatCurrency(s.netSalary)}</td>
                          <td className="erp-lg-td erp-lg-td-money">{formatCurrency(s.paidAmount)}</td>
                          <td className="erp-lg-td"><span className={`erp-hr-status-pill${s.status === "paid" ? " is-paid" : ""}`}>{s.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-5">
            <div className="erp-hr-info-card">
              <h2><Phone className="w-4 h-4 text-pink-600" /> Personal</h2>
              <dl>
                <div><dt>Father&apos;s name</dt><dd>{employee.fatherName || "—"}</dd></div>
                <div><dt>CNIC</dt><dd className="font-mono">{employee.cnic || "—"}</dd></div>
                <div><dt>Phone</dt><dd>{employee.phone || "—"}</dd></div>
                <div><dt>Address</dt><dd>{employee.address || "—"}</dd></div>
              </dl>
            </div>

            <div className="erp-hr-info-card">
              <h2><CalendarCheck className="w-4 h-4 text-pink-600" /> Absence rules</h2>
              <dl>
                <div><dt>Allowed absences</dt><dd>{employee.allowedAbsences ?? 0} / month</dd></div>
                <div><dt>Deduct per absent day</dt><dd>{employee.absenceDeductionPerDay > 0 ? formatCurrency(employee.absenceDeductionPerDay) : "Auto (salary ÷ days)"}</dd></div>
                <div><dt>Half day deduct</dt><dd>Half of per-day amount</dd></div>
              </dl>
            </div>

            <div className="erp-hr-info-card">
              <h2><Wallet className="w-4 h-4 text-pink-600" /> Bank</h2>
              <dl>
                <div><dt>Bank</dt><dd>{employee.bankName || "—"}</dd></div>
                <div><dt>Account</dt><dd className="font-mono">{employee.bankAccountNo || "—"}</dd></div>
              </dl>
            </div>

            <div className="erp-hr-info-card">
              <h2>
                {hasLogin ? <ShieldCheck className="w-4 h-4 text-emerald-600" /> : <ShieldOff className="w-4 h-4 text-slate-400" />}
                Portal access
              </h2>
              {hasLogin ? (
                <>
                  <p className="erp-hr-info-hint">Signs in at /dashboard — staff portal with attendance & salary.</p>
                  <dl>
                    <div><dt>Email</dt><dd>{employee.loginUser.email}</dd></div>
                    <div><dt>Role</dt><dd className="capitalize">{employee.loginUser.role}</dd></div>
                    <div><dt>Status</dt><dd>{employee.loginUser.isActive ? "Active" : "Disabled"}</dd></div>
                  </dl>
                  <div className="erp-hr-module-tags">
                    {(employee.loginUser.allowedModules || []).map((slug) => (
                      <span key={slug}>{MODULE_ACCENTS[slug]?.label || slug}</span>
                    ))}
                  </div>
                  {isAdmin && (
                    <Button variant="outline" onClick={openEdit} className="w-full mt-3 border-pink-200 text-acc-hr text-xs">
                      <KeyRound className="w-3.5 h-3.5" /> Edit login & access
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <p className="erp-hr-info-hint">No system login assigned. Edit employee to add credentials and module access.</p>
                  {isAdmin && (
                    <Button variant="outline" onClick={() => { openEdit(); setEditTab("access"); }} className="w-full border-pink-200 text-acc-hr">
                      <KeyRound className="w-4 h-4" /> Assign login access
                    </Button>
                  )}
                </>
              )}
            </div>

            {employee.notes && (
              <div className="erp-hr-info-card">
                <h2>Notes</h2>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{employee.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {form && (
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Edit employee" size="lg">
          <EmployeeForm
            form={form}
            onChange={setForm}
            onSubmit={handleSubmit}
            onCancel={() => setModalOpen(false)}
            submitting={submitting}
            isEdit
            isAdmin={isAdmin}
            hasLinkedLogin={hasLogin}
            activeTab={editTab}
            onTabChange={setEditTab}
            submitLabel="Save changes"
          />
        </Modal>
      )}
    </div>
  );
}

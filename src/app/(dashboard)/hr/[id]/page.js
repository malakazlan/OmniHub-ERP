"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, StatCard } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/Button";
import { DataTable } from "@/components/ui/DataTable";
import {
  Users, Loader2, ArrowLeft, Pencil, Trash2, Phone, Wallet,
  CalendarCheck, DollarSign, StickyNote,
} from "lucide-react";
import EmployeeLoginFields, { loginFormFromUser } from "@/components/hr/EmployeeLoginFields";
import { MODULE_ACCENTS } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/formatters";

const EMP_ROLES = ["salesperson", "driver", "accountant", "laborer", "officer", "manager"];
const ATTENDANCE_VARIANTS = { present: "success", absent: "danger", half_day: "warning", leave: "info", holiday: "neutral" };
const SALARY_VARIANTS = { pending: "warning", paid: "success" };
const MONTH_NAMES = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function DetailRow({ label, value, mono = false }) {
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <span className={`text-xs font-semibold text-slate-900 text-right ${mono ? "font-mono" : ""}`}>{value || "—"}</span>
    </div>
  );
}

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
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
    const loginFields = loginFormFromUser(employee.loginUser);
    setForm({
      name: employee.name || "",
      fatherName: employee.fatherName || "",
      cnic: employee.cnic || "",
      phone: employee.phone || "",
      role: employee.role || "",
      designation: employee.designation || "",
      department: employee.department || "",
      salary: employee.salary ?? "",
      joiningDate: employee.joiningDate ? String(employee.joiningDate).slice(0, 10) : "",
      address: employee.address || "",
      bankName: employee.bankName || "",
      bankAccountNo: employee.bankAccountNo || "",
      notes: employee.notes || "",
      isActive: employee.isActive,
      ...loginFields,
    });
    setEditTab(employee.loginUser ? "access" : "profile");
    setModalOpen(true);
  };

  const handleChange = (field) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm({ ...form, [field]: val });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) { showToast("Employee name is required", "warning"); return; }
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (user?.role !== "admin") {
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
    if (!window.confirm(`Delete employee "${employee.name}"? This cannot be undone.`)) return;
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
      <div className="h-96 flex items-center justify-center page-enter">
        <Loader2 className="w-8 h-8 text-acc-hr animate-spin" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="page-enter space-y-6">
        <PageHeader module="hr" title="Employee Not Found" icon={Users} breadcrumbs={[{ label: "HR", href: "/hr" }, { label: "Not Found" }]} />
        <Card><CardContent className="py-12 text-center">
          <p className="text-slate-500 mb-4">This employee could not be found.</p>
          <Link href="/hr"><Button variant="outline" className="border-slate-200 text-slate-700"><ArrowLeft className="w-4 h-4" /> Back to HR</Button></Link>
        </CardContent></Card>
      </div>
    );
  }

  const attendanceColumns = [
    { header: "Date", accessor: "date", cell: (row) => <span className="text-xs text-slate-500">{formatDate(row.date)}</span> },
    { header: "Status", accessor: "status", cell: (row) => <Badge variant={ATTENDANCE_VARIANTS[row.status] || "neutral"} className="capitalize">{row.status.replace("_", " ")}</Badge> },
    { header: "Notes", accessor: "notes", cell: (row) => <span className="text-xs text-slate-500">{row.notes || "—"}</span> },
  ];

  const salaryColumns = [
    { header: "Period", accessor: "month", cell: (row) => <span className="text-xs font-semibold text-slate-900">{MONTH_NAMES[row.month]} {row.year}</span> },
    { header: "Net Salary", accessor: "netSalary", cell: (row) => <span className="font-mono text-xs font-bold text-slate-900">{formatCurrency(row.netSalary)}</span> },
    { header: "Paid", accessor: "paidAmount", cell: (row) => <span className="font-mono text-xs text-emerald-600">{formatCurrency(row.paidAmount)}</span> },
    { header: "Status", accessor: "status", cell: (row) => <Badge variant={SALARY_VARIANTS[row.status] || "neutral"} className="capitalize">{row.status}</Badge> },
  ];

  const presentCount = (employee.attendance || []).filter((a) => a.status === "present").length;

  return (
    <div className="space-y-8 page-enter pb-10">
      <PageHeader
        module="hr"
        title={employee.name}
        description={[employee.designation, employee.department].filter(Boolean).join(" · ") || "Employee profile"}
        icon={Users}
        breadcrumbs={[{ label: "HR", href: "/hr" }, { label: employee.name }]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {employee.role && <Badge variant="info" className="capitalize">{employee.role}</Badge>}
            <Badge variant={employee.isActive ? "success" : "neutral"}>{employee.isActive ? "Active" : "Inactive"}</Badge>
            <Button variant="outline" onClick={openEdit} className="border-slate-200 text-slate-700"><Pencil className="w-4 h-4" /> Edit</Button>
            {user?.role === "admin" && (
              <Button variant="outline" onClick={handleDelete} className="border-red-200 text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /> Delete</Button>
            )}
            <Link href="/hr"><Button variant="outline" className="border-slate-200 text-slate-700"><ArrowLeft className="w-4 h-4" /> Back</Button></Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard module="hr" label="Monthly Salary" value={formatCurrency(employee.salary)} icon={Wallet} />
        <StatCard module="hr" label="Recent Present Days" value={presentCount} icon={CalendarCheck} />
        <StatCard module="hr" label="Salary Records" value={(employee.salaryRecords || []).length} icon={DollarSign} />
        <StatCard module="hr" label="Joined" value={formatDate(employee.joiningDate)} icon={CalendarCheck} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card>
            <CardHeader><h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><CalendarCheck className="w-4 h-4 text-acc-hr" /> Recent Attendance</h2></CardHeader>
            <CardContent>
              {(employee.attendance || []).length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">No attendance recorded yet.</p>
              ) : (
                <DataTable columns={attendanceColumns} data={employee.attendance} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><DollarSign className="w-4 h-4 text-acc-hr" /> Salary History</h2></CardHeader>
            <CardContent>
              {(employee.salaryRecords || []).length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">No salary records yet.</p>
              ) : (
                <DataTable columns={salaryColumns} data={employee.salaryRecords} />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Phone className="w-4 h-4 text-acc-hr" /> Personal</h2></CardHeader>
            <CardContent>
              <DetailRow label="Father's Name" value={employee.fatherName} />
              <DetailRow label="CNIC" value={employee.cnic} mono />
              <DetailRow label="Phone" value={employee.phone} />
              {employee.loginUser && (
                <>
                  <DetailRow label="Login email" value={employee.loginUser.email} />
                  <DetailRow label="Login role" value={employee.loginUser.role} />
                  <DetailRow
                    label="Login status"
                    value={employee.loginUser.isActive ? "Active" : "Disabled"}
                  />
                </>
              )}
              <DetailRow label="Address" value={employee.address} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Wallet className="w-4 h-4 text-acc-hr" /> Bank Details</h2></CardHeader>
            <CardContent>
              <DetailRow label="Bank" value={employee.bankName} />
              <DetailRow label="Account No." value={employee.bankAccountNo} mono />
            </CardContent>
          </Card>

          {employee.loginUser && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-acc-hr" /> Staff portal (login)
                </h2>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-slate-500">
                  This employee signs in at <span className="font-semibold text-slate-700">/dashboard</span> and sees the staff portal (attendance, salary, module shortcuts).
                </p>
                <DetailRow label="Login email" value={employee.loginUser.email} />
                <DetailRow label="System role" value={employee.loginUser.role} />
                <div>
                  <p className="text-xs text-slate-500 mb-2">Module access</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(employee.loginUser.allowedModules || []).map((slug) => (
                      <span
                        key={slug}
                        className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-pink-50 text-pink-800 border border-pink-100"
                      >
                        {MODULE_ACCENTS[slug]?.label || slug}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {employee.notes && (
            <Card>
              <CardHeader><h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><StickyNote className="w-4 h-4 text-acc-hr" /> Notes</h2></CardHeader>
              <CardContent><p className="text-sm text-slate-600 whitespace-pre-wrap">{employee.notes}</p></CardContent>
            </Card>
          )}
        </div>
      </div>

      {form && (
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Edit Employee" size="lg">
          <form onSubmit={handleSubmit} className="space-y-5">
            {user?.role === "admin" && (
              <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
                {[
                  ["profile", "Employee record"],
                  ["access", "System login & access"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setEditTab(key)}
                    className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      editTab === key ? "bg-white shadow text-slate-900" : "text-slate-600"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {(editTab === "profile" || user?.role !== "admin") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 md:col-span-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Full Name *</label>
                <input type="text" value={form.name} onChange={handleChange("name")} required className="input-field" />
              </div>
              {[
                ["fatherName", "Father's Name"], ["cnic", "CNIC"], ["phone", "Phone"],
                ["department", "Department"], ["designation", "Designation"], ["salary", "Monthly Salary"],
                ["joiningDate", "Joining Date"], ["bankName", "Bank Name"], ["bankAccountNo", "Bank Account No."],
              ].map(([key, label]) => (
                <div key={key} className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</label>
                  <input
                    type={key === "joiningDate" ? "date" : key === "salary" ? "number" : "text"}
                    value={form[key]} onChange={handleChange(key)} className="input-field"
                  />
                </div>
              ))}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Role</label>
                <select value={form.role} onChange={handleChange("role")} className="input-field">
                  <option value="">— Select —</option>
                  {EMP_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Address</label>
                <textarea value={form.address} onChange={handleChange("address")} className="input-field h-16 resize-none" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Notes</label>
                <textarea value={form.notes} onChange={handleChange("notes")} className="input-field h-16 resize-none" />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={form.isActive} onChange={handleChange("isActive")} className="rounded border-slate-300" />
                  Active
                </label>
              </div>
            </div>
            )}

            {user?.role === "admin" && editTab === "access" && (
              <EmployeeLoginFields
                form={form}
                setForm={setForm}
                isEdit
                hasLinkedLogin={!!employee.loginUser}
              />
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 border border-slate-200 cursor-pointer transition-colors">Cancel</button>
              <Button type="submit" disabled={submitting} className="bg-acc-hr hover:bg-pink-600 border-0">
                {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</> : "Save Changes"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { PageHeader, StatCard } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/Button";
import { DirectoryBackLink, DIRECTORY_POST_FLAG } from "@/components/accounts/DirectoryShell";
import {
  DirectoryAdminActions,
  DirectoryAdminNotice,
  confirmDirectoryDelete,
  useDirectoryAdmin,
} from "@/components/accounts/DirectoryAdminActions";
import { Users, Plus, Loader2, ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { defaultModulesForRole, loginRoleFromEmployeeRole } from "@/lib/modulePresets";
import EmployeeLoginFields, {
  loginFormFromUser,
  emptyLoginFormFields,
} from "@/components/hr/EmployeeLoginFields";

const EMP_ROLES = ["salesperson", "accountant", "laborer", "officer", "manager"];

const emptyForm = {
  name: "", phone: "", role: "officer", department: "", salary: "", cnic: "", assignUserId: "", isActive: true,
  ...emptyLoginFormFields("salesperson"),
  createLogin: true,
};

export default function DirectoryEmployeesPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const isAdmin = useDirectoryAdmin();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [users, setUsers] = useState([]);

  const load = () => {
    fetch("/api/hr/employees")
      .then((r) => r.json())
      .then((d) => { setEmployees((d.employees || []).filter((e) => e.role !== "driver")); setLoading(false); });
  };

  useEffect(() => {
    load();
    fetch("/api/settings/users")
      .then((r) => r.json())
      .then((d) => setUsers((d.users || []).filter((u) => u.isActive)));
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, allowedModules: defaultModulesForRole("salesperson") });
    setModalOpen(true);
  };

  const [editTab, setEditTab] = useState("profile");

  const openEdit = async (row) => {
    setEditingId(row.id);
    setEditTab("profile");
    try {
      const res = await fetch(`/api/hr/employees/${row.id}`);
      const data = await res.json();
      const emp = data.employee || row;
      setForm({
        name: emp.name || "",
        phone: emp.phone || "",
        role: emp.role || "officer",
        department: emp.department || "",
        salary: emp.salary != null ? String(emp.salary) : "",
        cnic: emp.cnic || "",
        assignUserId: emp.userId ? String(emp.userId) : "",
        isActive: emp.isActive !== false,
        ...loginFormFromUser(emp.loginUser),
        linkedLogin: !!emp.loginUser,
      });
      if (emp.loginUser) setEditTab("access");
      setModalOpen(true);
    } catch {
      showToast("Could not load employee details", "error");
    }
  };

  const handleDelete = async (row) => {
    if (!isAdmin) return;
    if (!(await confirmDirectoryDelete(`employee "${row.name}"`))) return;
    try {
      const res = await fetch(`/api/hr/employees/${row.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast("Employee deleted", "success");
        load();
      } else showToast(data.error || "Delete failed", "error");
    } catch {
      showToast("Error processing request", "error");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingId ? `/api/hr/employees/${editingId}` : "/api/hr/employees";
      const method = editingId ? "PUT" : "POST";
      const payload = editingId
        ? {
            name: form.name,
            phone: form.phone,
            role: form.role,
            department: form.department,
            salary: form.salary,
            cnic: form.cnic,
            isActive: form.isActive,
            loginEmail: form.loginEmail,
            loginPassword: form.loginPassword || undefined,
            loginRole: form.loginRole,
            allowedModules: form.allowedModules,
            loginIsActive: form.loginIsActive,
            createLogin: form.createLogin,
          }
        : {
          ...form,
          createAccount: true,
          createCashAccount: true,
          createLogin: form.createLogin,
          loginEmail: form.createLogin ? form.loginEmail : undefined,
          loginPassword: form.createLogin ? form.loginPassword : undefined,
          loginRole: form.createLogin ? form.loginRole : undefined,
          allowedModules: form.createLogin ? form.allowedModules : undefined,
          assignUserId: form.createLogin ? "" : form.assignUserId,
          ...DIRECTORY_POST_FLAG,
        };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(
          editingId ? "Employee updated" : form.createLogin ? "Employee + login created" : "Employee + salary + cash accounts created",
          "success"
        );
        setModalOpen(false);
        setEditingId(null);
        setForm(emptyForm);
        load();
      } else showToast(data.error || "Failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { header: "Name", accessor: "name", cell: (r) => <span className="font-semibold">{r.name}</span> },
    { header: "Role", accessor: "role", cell: (r) => <span className="text-xs capitalize">{r.role || "—"}</span> },
    { header: "Salary", accessor: "salary", cell: (r) => <span className="font-mono text-xs">{formatCurrency(r.salary)}</span> },
    {
      header: "Cash account",
      accessor: "cashAccount",
      cell: (r) => (
        <span className="text-xs text-slate-600">
          {r.cashAccount ? `${r.cashAccount.name} (${formatCurrency(r.cashAccount.balance || 0)})` : "—"}
        </span>
      ),
    },
    {
      header: "Status",
      accessor: "isActive",
      cell: (r) => <Badge variant={r.isActive ? "success" : "neutral"}>{r.isActive ? "Active" : "Inactive"}</Badge>,
    },
    ...(isAdmin
      ? [{
          header: "",
          accessor: "id",
          sortable: false,
          cell: (row) => (
            <DirectoryAdminActions onEdit={() => openEdit(row)} onDelete={() => handleDelete(row)} />
          ),
        }]
      : []),
  ];

  return (
    <div className="space-y-8 page-enter">
      <DirectoryBackLink segment="Employees" />
      <PageHeader module="accounts" title="Employees" description="Staff records with salary payable ledger accounts." icon={Users}
        breadcrumbs={[{ label: "Project Accounts", href: "/accounts/directory" }, { label: "Employees" }]}
        actions={
          <>
            <Link href="/accounts/directory"><Button variant="outline"><ArrowLeft className="w-4 h-4" /> Hub</Button></Link>
            {isAdmin && (
              <Button onClick={openCreate} className="bg-acc-hr border-0"><Plus className="w-4 h-4" /> Add Employee</Button>
            )}
          </>
        }
      />
      <DirectoryAdminNotice />
      <StatCard module="hr" label="Employees (excl. drivers)" value={employees.length} icon={Users} />
      <Card><CardContent>{loading ? <Loader2 className="animate-spin mx-auto" /> : <DataTable columns={columns} data={employees} onRowClick={(r) => router.push(`/hr/${r.id}`)} />}</CardContent></Card>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit employee" : "Register employee"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-3">
          {editingId && isAdmin && (
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-2">
              {[
                ["profile", "Record"],
                ["access", "Login & modules"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setEditTab(key)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                    editTab === key ? "bg-white shadow" : "text-slate-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {(editTab === "profile" || !editingId || !isAdmin) && (
          <>
          <input className="input-field" placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <select
            className="input-field"
            value={form.role}
            onChange={(e) => {
              const role = e.target.value;
              const loginRole = loginRoleFromEmployeeRole(role);
              setForm({
                ...form,
                role,
                loginRole,
                allowedModules: defaultModulesForRole(loginRole),
              });
            }}
          >
            {EMP_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <input className="input-field" placeholder="Monthly salary" type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
          <input className="input-field" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          {!editingId && (
            <>
              <EmployeeLoginFields form={form} setForm={setForm} isEdit={false} />
              {!form.createLogin && (
                <select
                  className="input-field"
                  value={form.assignUserId}
                  onChange={(e) => setForm({ ...form, assignUserId: e.target.value })}
                >
                  <option value="">Link existing login user (optional)</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              )}
              <p className="text-[10px] text-slate-500">A petty-cash ledger account is created automatically for each employee.</p>
            </>
          )}
          </>
          )}

          {editingId && isAdmin && editTab === "access" && (
            <EmployeeLoginFields
              form={form}
              setForm={setForm}
              isEdit
              hasLinkedLogin={!!form.linkedLogin}
            />
          )}

          {editingId && editTab === "profile" && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Active employee & linked ledger accounts
            </label>
          )}

          {!editingId && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Active
            </label>
          )}
          <Button type="submit" disabled={submitting} className="w-full bg-acc-hr border-0">{submitting ? "Saving…" : editingId ? "Save changes" : "Save"}</Button>
        </form>
      </Modal>
    </div>
  );
}

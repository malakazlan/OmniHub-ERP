"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, StatCard } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/Button";
import { Users, Plus, Loader2, ArrowLeft, Shield, Pencil, Trash2 } from "lucide-react";
import { MODULES } from "@/lib/constants";
import { formatDate } from "@/lib/formatters";
import ModuleAccessTabs from "@/components/settings/ModuleAccessTabs";
import { defaultModulesForRole } from "@/lib/modulePresets";

const ROLES = ["admin", "manager", "salesperson", "accountant", "driver", "viewer"];

const emptyForm = {
  email: "",
  name: "",
  password: "",
  phone: "",
  role: "viewer",
  isActive: true,
  cashAccountId: "",
  allowedModules: defaultModulesForRole("viewer"),
};

export default function UsersSettingsPage() {
  const { showToast } = useToast();
  const { user: currentUser, loading: authLoading } = useAuth();
  const [users, setUsers] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/settings/users");
      const data = await res.json();
      if (res.ok) setUsers(data.users || []);
      else showToast(data.error || "Failed to load users", "error");
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && currentUser?.role === "admin") {
      fetchUsers();
      fetch("/api/accounts?category=cash&assignable=1")
        .then((r) => r.json())
        .then((d) => {
          if (d.accounts) setCashAccounts(d.accounts.filter((a) => a.isActive));
        })
        .catch(() => {});
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, currentUser]);

  const handleChange = (field) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    if (field === "role") {
      setForm((prev) => ({
        ...prev,
        role: val,
        allowedModules: val === "admin" ? [...MODULES] : defaultModulesForRole(val),
      }));
      return;
    }
    setForm({ ...form, [field]: val });
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      email: row.email || "",
      name: row.name || "",
      password: "",
      phone: row.phone || "",
      role: row.role || "viewer",
      isActive: row.isActive !== false,
      allowedModules: Array.isArray(row.allowedModules)
        ? row.allowedModules
        : defaultModulesForRole(row.role || "viewer"),
      cashAccountId: row.cashAccountId ? String(row.cashAccountId) : "",
    });
    setModalOpen(true);
  };

  const handleDelete = async (row) => {
    if (row.id === currentUser?.id) {
      showToast("You cannot delete your own account", "warning");
      return;
    }
    if (!window.confirm(`Delete user "${row.name}"?`)) return;
    try {
      const res = await fetch(`/api/settings/users/${row.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast("User deleted", "success");
        fetchUsers();
      } else showToast(data.error || "Failed to delete user", "error");
    } catch {
      showToast("Error processing request", "error");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.name || (!editingId && !form.password)) {
      showToast("Email, name, and password are required", "warning");
      return;
    }
    setSubmitting(true);
    try {
      const modules =
        form.role === "admin"
          ? MODULES
          : form.allowedModules?.length
            ? form.allowedModules
            : defaultModulesForRole(form.role);

      const payload = { ...form, allowedModules: modules };
      if (editingId && !form.password) delete payload.password;

      const url = editingId ? `/api/settings/users/${editingId}` : "/api/settings/users";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(editingId ? "User updated!" : `User "${form.name}" created!`, "success");
        setModalOpen(false);
        setForm(emptyForm);
        setEditingId(null);
        fetchUsers();
      } else showToast(data.error || "Failed to save user", "error");
    } catch {
      showToast("Error processing request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!authLoading && currentUser?.role !== "admin") {
    return (
      <div className="page-enter space-y-6">
        <PageHeader
          module="settings"
          title="User Management"
          description="Admin access required."
          icon={Users}
          breadcrumbs={[
            { label: "Settings", href: "/settings" },
            { label: "Users" },
          ]}
        />
        <Card>
          <CardContent className="text-center py-12">
            <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">Only administrators can manage users.</p>
            <Link href="/settings" className="text-sm text-acc-settings hover:underline mt-2 inline-block">
              Back to Settings
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeCount = users.filter((u) => u.isActive).length;

  const columns = [
    {
      header: "Name",
      accessor: "name",
      cell: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.name}</p>
          <p className="text-[10px] text-slate-500">{row.email}</p>
        </div>
      ),
    },
    {
      header: "Role",
      accessor: "role",
      cell: (row) => (
        <Badge variant={row.role === "admin" ? "indigo" : "neutral"} className="capitalize">
          {row.role}
        </Badge>
      ),
    },
    {
      header: "Phone",
      accessor: "phone",
      cell: (row) => <span className="text-xs text-slate-600">{row.phone || "—"}</span>,
    },
    {
      header: "Cash account",
      accessor: "cashAccountId",
      cell: (row) => (
        <span className="text-xs text-slate-600">
          {row.primaryCashAccount?.name || "—"}
        </span>
      ),
    },
    {
      header: "Status",
      accessor: "isActive",
      cell: (row) => (
        <Badge variant={row.isActive ? "success" : "neutral"}>
          {row.isActive ? "Active" : "Disabled"}
        </Badge>
      ),
    },
    {
      header: "Last Login",
      accessor: "lastLogin",
      cell: (row) => (
        <span className="text-xs text-slate-500">{formatDate(row.lastLogin)}</span>
      ),
    },
    {
      header: "",
      accessor: "id",
      sortable: false,
      cell: (row) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); openEdit(row); }}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-acc-settings transition-colors cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {row.id !== currentUser?.id && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleDelete(row); }}
              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8 page-enter">
      <PageHeader
        module="settings"
        title="User Management"
        description="Create users and assign roles for system access."
        icon={Users}
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "Users" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/settings">
              <Button variant="outline" className="border-slate-200 text-slate-600">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            </Link>
            <Button
              onClick={openCreate}
              className="bg-acc-settings hover:bg-slate-700 border-0 text-white"
            >
              <Plus className="w-4 h-4" /> Add User
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard module="settings" label="Total Users" value={users.length} icon={Users} />
        <StatCard module="settings" label="Active" value={activeCount} icon={Shield} />
      </div>

      <Card>
        <CardContent>
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-acc-settings animate-spin" />
            </div>
          ) : (
            <DataTable columns={columns} data={users} searchKey="name" placeholder="Search users..." />
          )}
        </CardContent>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit User" : "Create User"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ["name", "Full Name *"],
              ["email", "Email *"],
              ["password", editingId ? "New Password (leave blank to keep)" : "Password *"],
              ["phone", "Phone"],
            ].map(([key, label]) => (
              <div key={key} className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {label}
                </label>
                <input
                  type={key === "password" ? "password" : key === "email" ? "email" : "text"}
                  value={form[key]}
                  onChange={handleChange(key)}
                  required={!editingId && (key === "name" || key === "email" || key === "password")}
                  className="input-field"
                />
              </div>
            ))}
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Role
              </label>
              <select value={form.role} onChange={handleChange("role")} className="input-field">
                {ROLES.map((r) => (
                  <option key={r} value={r} className="capitalize">
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Assigned cash account
              </label>
              <select
                value={form.cashAccountId}
                onChange={handleChange("cashAccountId")}
                className="input-field"
              >
                <option value="">No restriction / no default</option>
                {cashAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}{a.code ? ` (${a.code})` : ""}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Required for payments: this user can only use this cash account on sales, purchases, and expenses.
              </p>
            </div>
            <div className="md:col-span-2">
              <ModuleAccessTabs
                selected={form.role === "admin" ? MODULES : form.allowedModules || []}
                onChange={(mods) => setForm({ ...form, allowedModules: mods })}
                disabled={form.role === "admin"}
              />
            </div>
            {editingId && (
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={handleChange("isActive")}
                    disabled={editingId === currentUser?.id}
                    className="rounded border-slate-300"
                  />
                  Active
                </label>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 border border-slate-200 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <Button type="submit" disabled={submitting} className="bg-acc-settings hover:bg-slate-700 border-0 text-white">
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> {editingId ? "Saving..." : "Creating..."}
                </>
              ) : editingId ? "Save Changes" : "Create User"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

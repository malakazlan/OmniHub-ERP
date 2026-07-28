"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Wallet, Plus, Loader2, ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

const emptyForm = {
  name: "",
  openingBalance: "",
  assignToAdmin: false,
  assignToUserId: "",
  isActive: true,
};

export default function DirectoryCashPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const isAdmin = useDirectoryAdmin();
  const [accounts, setAccounts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [canManageAll, setCanManageAll] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    fetch("/api/accounts/directory/cash")
      .then((r) => r.json())
      .then((d) => {
        setAccounts(d.accounts || []);
        setCanManageAll(!!d.canManageAll);
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
    if (isAdmin) {
      fetch("/api/settings/users")
        .then((r) => r.json())
        .then((d) => setUsers((d.users || []).filter((u) => u.isActive)));
    }
  }, [isAdmin]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    const assignToAdmin = row.ownerUser?.role === "admin";
    setEditingId(row.id);
    setForm({
      name: row.name || "",
      openingBalance: "",
      assignToAdmin,
      assignToUserId: assignToAdmin ? "" : row.ownerUserId ? String(row.ownerUserId) : "",
      isActive: row.isActive !== false,
    });
    setModalOpen(true);
  };

  const handleDelete = async (row) => {
    if (!isAdmin) return;
    if (!(await confirmDirectoryDelete(`cash account "${row.name}"`))) return;
    try {
      const res = await fetch(`/api/accounts/${row.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast("Cash account deleted", "success");
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
      if (editingId) {
        let ownerUserId = form.assignToUserId ? parseInt(form.assignToUserId, 10) : null;
        if (form.assignToAdmin) {
          const adminUser = users.find((u) => u.role === "admin");
          ownerUserId = adminUser?.id ?? null;
        }
        const res = await fetch(`/api/accounts/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            isActive: form.isActive,
            ownerUserId: form.assignToAdmin || form.assignToUserId ? ownerUserId : null,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          showToast("Cash account updated", "success");
          setModalOpen(false);
          setEditingId(null);
          setForm(emptyForm);
          load();
        } else showToast(data.error || "Failed", "error");
      } else {
        const res = await fetch("/api/accounts/directory/cash", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            assignToUserId: form.assignToAdmin ? undefined : form.assignToUserId || undefined,
            ...DIRECTORY_POST_FLAG,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          showToast("Cash account created", "success");
          setModalOpen(false);
          setForm(emptyForm);
          load();
        } else showToast(data.error || "Failed", "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { header: "Account", accessor: "name", cell: (r) => <span className="font-semibold">{r.name}</span> },
    { header: "Code", accessor: "code", cell: (r) => <span className="font-mono text-xs text-slate-500">{r.code || "—"}</span> },
    {
      header: "Assigned to",
      accessor: "ownerUser",
      cell: (r) => (
        <span className="text-xs">
          {r.ownerUser ? `${r.ownerUser.name} (${r.ownerUser.role})` : r.employeeCash ? `Employee: ${r.employeeCash.name}` : "Office (admin only)"}
        </span>
      ),
    },
    { header: "Balance", accessor: "balance", cell: (r) => <span className="font-mono text-xs">{formatCurrency(r.balance || 0)}</span> },
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
      <DirectoryBackLink segment="Cash" />
      <PageHeader
        module="accounts"
        title="Cash Accounts"
        description={
          canManageAll
            ? "Petty cash and tills. Assign to admin or a user; employees get a cash account when registered."
            : "Your assigned cash account(s) only."
        }
        icon={Wallet}
        breadcrumbs={[{ label: "Project Accounts", href: "/accounts/directory" }, { label: "Cash" }]}
        actions={
          <>
            <Link href="/accounts/directory">
              <Button variant="outline"><ArrowLeft className="w-4 h-4" /> Hub</Button>
            </Link>
            {isAdmin && (
              <Button onClick={openCreate} className="bg-acc-accounts border-0">
                <Plus className="w-4 h-4" /> Add Cash Account
              </Button>
            )}
          </>
        }
      />

      <DirectoryAdminNotice />

      <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-xs text-slate-600">
        <strong className="text-slate-800">Access:</strong> Admin, manager, and accountant see all cash accounts.
        Other users only see accounts assigned to them. Use <strong>Assign to admin</strong> for the main office cash drawer.
      </div>

      <StatCard module="accounts" label="Cash accounts" value={accounts.length} icon={Wallet} />

      <Card>
        <CardContent>
          {loading ? <Loader2 className="animate-spin mx-auto" /> : (
            <DataTable
              columns={columns}
              data={accounts}
              onRowClick={(r) => router.push(`/accounts/${r.id}`)}
            />
          )}
        </CardContent>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit cash account" : "Register cash account"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="input-field"
            placeholder="Account name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          {!editingId && (
            <input
              className="input-field"
              type="number"
              step="0.01"
              placeholder="Opening balance"
              value={form.openingBalance}
              onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
            />
          )}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.assignToAdmin}
              onChange={(e) => setForm({ ...form, assignToAdmin: e.target.checked, assignToUserId: "" })}
            />
            Assign to admin (main office cash — admin can access all accounts anyway)
          </label>
          {!form.assignToAdmin && (
            <select
              className="input-field"
              value={form.assignToUserId}
              onChange={(e) => setForm({ ...form, assignToUserId: e.target.value })}
            >
              <option value="">Office pool (no user — admin/manager/accountant only)</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name} — {u.email}</option>
              ))}
            </select>
          )}
          {editingId && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Active account
            </label>
          )}
          <Button type="submit" disabled={submitting} className="w-full bg-acc-accounts border-0">
            {submitting ? "Saving…" : editingId ? "Save changes" : "Save"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}

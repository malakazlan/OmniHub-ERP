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
import { Landmark, Plus, Loader2, ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

const emptyForm = {
  bankName: "",
  accountTitle: "",
  accountNumber: "",
  branchCode: "",
  branchName: "",
  ledgerName: "",
  openingBalance: "",
  isActive: true,
};

export default function DirectoryBankPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const isAdmin = useDirectoryAdmin();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    fetch("/api/accounts/directory/bank")
      .then((r) => r.json())
      .then((d) => { setAccounts(d.accounts || []); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingRow(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingRow(row);
    const meta = row.bankMeta;
    setForm({
      bankName: meta?.bankName || "",
      accountTitle: meta?.accountTitle || "",
      accountNumber: meta?.accountNumber || row.reference || "",
      branchCode: meta?.branchCode || "",
      branchName: meta?.branchName || "",
      ledgerName: row.name || "",
      openingBalance: "",
      isActive: row.isActive !== false,
    });
    setModalOpen(true);
  };

  const handleDelete = async (row) => {
    if (!isAdmin) return;
    if (!(await confirmDirectoryDelete(`bank account "${row.name}"`))) return;
    try {
      const res = await fetch(`/api/accounts/${row.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast("Bank account deleted", "success");
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
      if (editingRow) {
        const ledgerRes = await fetch(`/api/accounts/${editingRow.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.ledgerName.trim() || `${form.bankName} — ${form.accountTitle}`,
            reference: form.accountNumber,
            isActive: form.isActive,
          }),
        });
        const ledgerData = await ledgerRes.json();
        if (!ledgerRes.ok) {
          showToast(ledgerData.error || "Failed to update ledger", "error");
          return;
        }
        if (editingRow.bankMeta?.id) {
          const bankRes = await fetch(`/api/settings/bank-accounts/${editingRow.bankMeta.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bankName: form.bankName,
              accountTitle: form.accountTitle,
              accountNumber: form.accountNumber,
              branchCode: form.branchCode,
              branchName: form.branchName,
              isActive: form.isActive,
            }),
          });
          const bankData = await bankRes.json();
          if (!bankRes.ok) {
            showToast(bankData.error || "Failed to update bank details", "error");
            return;
          }
        }
        showToast("Bank account updated", "success");
        setModalOpen(false);
        setEditingRow(null);
        setForm(emptyForm);
        load();
      } else {
        const res = await fetch("/api/accounts/directory/bank", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, ...DIRECTORY_POST_FLAG }),
        });
        const data = await res.json();
        if (res.ok) {
          showToast("Bank ledger account created", "success");
          setModalOpen(false);
          load();
        } else showToast(data.error || "Failed", "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { header: "Ledger name", accessor: "name", cell: (r) => <span className="font-semibold">{r.name}</span> },
    {
      header: "Bank details",
      accessor: "bankMeta",
      cell: (r) => (
        <span className="text-xs text-slate-600">
          {r.bankMeta ? `${r.bankMeta.bankName} · ${r.bankMeta.accountNumber}` : r.reference || "—"}
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
      <DirectoryBackLink segment="Bank" />
      <PageHeader
        module="accounts"
        title="Bank Accounts"
        description="Company bank accounts linked to the chart of accounts for payments and receipts."
        icon={Landmark}
        breadcrumbs={[{ label: "Project Accounts", href: "/accounts/directory" }, { label: "Bank" }]}
        actions={
          <>
            <Link href="/accounts/directory"><Button variant="outline"><ArrowLeft className="w-4 h-4" /> Hub</Button></Link>
            {isAdmin && (
              <Button onClick={openCreate} className="bg-acc-accounts border-0">
                <Plus className="w-4 h-4" /> Add Bank Account
              </Button>
            )}
          </>
        }
      />

      <DirectoryAdminNotice />

      <StatCard module="accounts" label="Bank accounts" value={accounts.length} icon={Landmark} />

      <Card>
        <CardContent>
          {loading ? <Loader2 className="animate-spin mx-auto" /> : (
            <DataTable columns={columns} data={accounts} onRowClick={(r) => router.push(`/accounts/${r.id}`)} />
          )}
        </CardContent>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingRow ? "Edit bank account" : "Register bank account"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-3">
          <input className="input-field" placeholder="Bank name *" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} required />
          <input className="input-field" placeholder="Account title *" value={form.accountTitle} onChange={(e) => setForm({ ...form, accountTitle: e.target.value })} required />
          <input className="input-field" placeholder="Account number *" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} required />
          <input className="input-field" placeholder="Branch code" value={form.branchCode} onChange={(e) => setForm({ ...form, branchCode: e.target.value })} />
          <input className="input-field" placeholder="Branch name" value={form.branchName} onChange={(e) => setForm({ ...form, branchName: e.target.value })} />
          <input className="input-field" placeholder="Ledger display name" value={form.ledgerName} onChange={(e) => setForm({ ...form, ledgerName: e.target.value })} />
          {!editingRow && (
            <input className="input-field" type="number" step="0.01" placeholder="Opening balance" value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: e.target.value })} />
          )}
          {editingRow && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Active account
            </label>
          )}
          <Button type="submit" disabled={submitting} className="w-full bg-acc-accounts border-0">
            {submitting ? "Saving…" : editingRow ? "Save changes" : "Save"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}

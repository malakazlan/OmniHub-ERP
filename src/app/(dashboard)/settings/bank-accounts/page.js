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
import { DirectoryRegisterBanner } from "@/components/accounts/DirectoryShell";
import { Building2, Loader2, ArrowLeft, Pencil, Trash2, Plus } from "lucide-react";

const emptyForm = {
  bankName: "",
  accountTitle: "",
  accountNumber: "",
  branchCode: "",
  branchName: "",
  isActive: true,
};

export default function BankAccountsSettingsPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchAccounts = async () => {
    try {
      const res = await fetch("/api/settings/bank-accounts");
      const data = await res.json();
      if (res.ok) setBankAccounts(data.bankAccounts || []);
      else showToast(data.error || "Failed to load bank accounts", "error");
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleChange = (field) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm({ ...form, [field]: val });
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      bankName: row.bankName || "",
      accountTitle: row.accountTitle || "",
      accountNumber: row.accountNumber || "",
      branchCode: row.branchCode || "",
      branchName: row.branchName || "",
      isActive: row.isActive !== false,
    });
    setModalOpen(true);
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete bank account "${row.bankName} - ${row.accountTitle}"?`)) return;
    try {
      const res = await fetch(`/api/settings/bank-accounts/${row.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast("Bank account deleted", "success");
        fetchAccounts();
      } else showToast(data.error || "Failed to delete account", "error");
    } catch {
      showToast("Error processing request", "error");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editingId) return;
    if (!form.bankName || !form.accountTitle || !form.accountNumber) {
      showToast("Bank name, account title, and number are required", "warning");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/settings/bank-accounts/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Bank account updated!", "success");
        setModalOpen(false);
        fetchAccounts();
      } else showToast(data.error || "Failed to save account", "error");
    } catch {
      showToast("Error processing request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const activeCount = bankAccounts.filter((a) => a.isActive).length;

  const columns = [
    {
      header: "Bank",
      accessor: "bankName",
      cell: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.bankName}</p>
          {row.branchName && <p className="text-[10px] text-slate-500">{row.branchName}</p>}
        </div>
      ),
    },
    {
      header: "Account Title",
      accessor: "accountTitle",
      cell: (row) => <span className="text-sm text-slate-700">{row.accountTitle}</span>,
    },
    {
      header: "Account No.",
      accessor: "accountNumber",
      cell: (row) => (
        <span className="font-mono text-xs text-slate-600">{row.accountNumber}</span>
      ),
    },
    {
      header: "Branch Code",
      accessor: "branchCode",
      cell: (row) => (
        <span className="text-xs text-slate-500">{row.branchCode || "—"}</span>
      ),
    },
    {
      header: "Status",
      accessor: "isActive",
      cell: (row) => (
        <Badge variant={row.isActive ? "success" : "neutral"}>
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
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
          {user?.role === "admin" && (
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
        title="Bank Accounts"
        description="View bank metadata. New bank ledger accounts are registered in All Accounts."
        icon={Building2}
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "Bank Accounts" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/settings">
              <Button variant="outline" className="border-slate-200 text-slate-600">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            </Link>
            <Link href="/accounts?category=bank&create=1">
              <Button variant="outline" className="border-sky-200 text-acc-accounts hover:bg-sky-50">
                <Plus className="w-4 h-4" /> Register in All Accounts
              </Button>
            </Link>
          </div>
        }
      />

      <DirectoryRegisterBanner category="bank" label="bank" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard module="settings" label="Total Accounts" value={bankAccounts.length} icon={Building2} />
        <StatCard module="settings" label="Active" value={activeCount} icon={Building2} />
      </div>

      <Card>
        <CardContent>
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-acc-settings animate-spin" />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={bankAccounts}
              searchKey="bankName"
              placeholder="Search bank accounts..."
            />
          )}
        </CardContent>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Edit Bank Account" size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ["bankName", "Bank Name *"],
              ["accountTitle", "Account Title *"],
              ["accountNumber", "Account Number *"],
              ["branchCode", "Branch Code"],
              ["branchName", "Branch Name"],
            ].map(([key, label]) => (
              <div key={key} className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {label}
                </label>
                <input
                  type="text"
                  value={form[key]}
                  onChange={handleChange(key)}
                  required={key === "bankName" || key === "accountTitle" || key === "accountNumber"}
                  className="input-field"
                />
              </div>
            ))}
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={handleChange("isActive")} className="rounded border-slate-300" />
                Active
              </label>
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
            <Button type="submit" disabled={submitting} className="bg-acc-settings hover:bg-slate-700 border-0 text-white">
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

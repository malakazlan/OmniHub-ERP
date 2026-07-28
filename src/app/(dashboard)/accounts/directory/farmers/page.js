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
import { Sprout, Plus, Loader2, ArrowLeft, UserPlus } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

const emptyForm = {
  name: "", fatherName: "", cnic: "", phone: "", whatsappNumber: "",
  city: "", village: "", address: "", bankName: "", bankAccountNo: "", notes: "",
  isActive: true,
};

export default function DirectoryFarmersPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const isAdmin = useDirectoryAdmin();
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchFarmers = async () => {
    try {
      const res = await fetch("/api/farmers");
      const data = await res.json();
      if (res.ok) setFarmers(data.farmers || []);
      else showToast(data.error || "Failed to load farmers", "error");
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFarmers(); }, []);

  const handleChange = (f) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm({ ...form, [f]: val });
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      name: row.name || "",
      fatherName: row.fatherName || "",
      cnic: row.cnic || "",
      phone: row.phone || "",
      whatsappNumber: row.whatsappNumber || "",
      city: row.city || "",
      village: row.village || "",
      address: row.address || "",
      bankName: row.bankName || "",
      bankAccountNo: row.bankAccountNo || "",
      notes: row.notes || "",
      isActive: row.isActive !== false,
    });
    setModalOpen(true);
  };

  const handleDelete = async (row) => {
    if (!isAdmin) return;
    if (!(await confirmDirectoryDelete(`farmer "${row.name}"`))) return;
    try {
      const res = await fetch(`/api/farmers/${row.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast("Farmer deleted", "success");
        fetchFarmers();
      } else showToast(data.error || "Delete failed", "error");
    } catch {
      showToast("Error processing request", "error");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) { showToast("Farmer name is required", "warning"); return; }
    setSubmitting(true);
    try {
      const url = editingId ? `/api/farmers/${editingId}` : "/api/farmers";
      const method = editingId ? "PUT" : "POST";
      const body = editingId ? form : { ...form, ...DIRECTORY_POST_FLAG };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(editingId ? "Farmer updated" : `Farmer "${form.name}" registered!`, "success");
        setModalOpen(false);
        setForm(emptyForm);
        setEditingId(null);
        fetchFarmers();
      } else showToast(data.error || "Failed", "error");
    } catch {
      showToast("Error processing request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { header: "Name", accessor: "name", cell: (row) => <p className="font-semibold">{row.name}</p> },
    { header: "City", accessor: "city", cell: (row) => <span className="text-xs text-slate-500">{row.city || "—"}</span> },
    { header: "Phone", accessor: "phone", cell: (row) => <span className="text-xs">{row.phone || "—"}</span> },
    { header: "Ledger balance", accessor: "balance", cell: (row) => <span className="font-mono text-xs font-bold">{formatCurrency(Math.abs(row.balance || 0))}</span> },
    { header: "Status", accessor: "isActive", cell: (row) => <Badge variant={row.isActive ? "success" : "neutral"}>{row.isActive ? "Active" : "Off"}</Badge> },
    ...(isAdmin
      ? [{
          header: "",
          accessor: "id",
          sortable: false,
          cell: (row) => (
            <DirectoryAdminActions
              onEdit={() => openEdit(row)}
              onDelete={() => handleDelete(row)}
            />
          ),
        }]
      : []),
  ];

  return (
    <div className="space-y-8 page-enter">
      <DirectoryBackLink segment="Farmers" />
      <PageHeader
        module="accounts"
        title="Farmers (Suppliers)"
        description="Register and manage farmer payable accounts."
        icon={Sprout}
        breadcrumbs={[{ label: "Project Accounts", href: "/accounts/directory" }, { label: "Farmers" }]}
        actions={
          <div className="flex gap-2">
            <Link href="/accounts/directory">
              <Button variant="outline" className="border-slate-200 text-slate-600"><ArrowLeft className="w-4 h-4" /> Hub</Button>
            </Link>
            {isAdmin && (
              <Button onClick={openCreate} className="bg-acc-farmers hover:bg-emerald-600 border-0">
                <Plus className="w-4 h-4" /> Register Farmer
              </Button>
            )}
          </div>
        }
      />

      <DirectoryAdminNotice />
      <StatCard module="farmers" label="Registered farmers" value={farmers.length} icon={UserPlus} />

      <Card><CardContent>
        {loading ? <div className="h-48 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-acc-farmers" /></div> : (
          <DataTable columns={columns} data={farmers} searchKey="name" onRowClick={(row) => router.push(`/farmers/${row.id}`)} />
        )}
      </CardContent></Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit farmer" : "Register farmer + ledger account"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editingId && (
            <p className="text-xs text-slate-500">A payable account is created in the chart of accounts automatically.</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1">
              <label className="text-[11px] font-semibold uppercase text-slate-500">Name *</label>
              <input type="text" value={form.name} onChange={handleChange("name")} required className="input-field" />
            </div>
            {[["phone", "Phone"], ["city", "City"], ["village", "Village"], ["cnic", "CNIC"]].map(([k, l]) => (
              <div key={k} className="space-y-1">
                <label className="text-[11px] font-semibold uppercase text-slate-500">{l}</label>
                <input type="text" value={form[k]} onChange={handleChange(k)} className="input-field" />
              </div>
            ))}
            {editingId && (
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.isActive} onChange={handleChange("isActive")} />
                  Active account
                </label>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-xs border rounded-xl cursor-pointer">Cancel</button>
            <Button type="submit" disabled={submitting} className="bg-acc-farmers border-0">{submitting ? "Saving…" : editingId ? "Save changes" : "Save"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

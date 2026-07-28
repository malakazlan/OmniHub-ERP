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
import { Store, Plus, Loader2, ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

const emptyForm = { name: "", ownerName: "", phone: "", city: "", shopType: "retail", creditLimit: "", isActive: true };

export default function DirectoryShopsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const isAdmin = useDirectoryAdmin();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = () => fetch("/api/shops").then((r) => r.json()).then((d) => { setShops(d.shops || []); setLoading(false); });
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      name: row.name || "", ownerName: row.ownerName || "", phone: row.phone || "", city: row.city || "",
      shopType: row.shopType || "retail", creditLimit: row.creditLimit ? String(row.creditLimit) : "",
      isActive: row.isActive !== false,
    });
    setModalOpen(true);
  };

  const handleDelete = async (row) => {
    if (!(await confirmDirectoryDelete(`shop "${row.name}"`))) return;
    const res = await fetch(`/api/shops/${row.id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) { showToast("Shop deleted", "success"); load(); }
    else showToast(data.error || "Delete failed", "error");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(editingId ? `/api/shops/${editingId}` : "/api/shops", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? form : { ...form, ...DIRECTORY_POST_FLAG }),
      });
      const data = await res.json();
      if (res.ok) { showToast(editingId ? "Shop updated" : "Shop registered", "success"); setModalOpen(false); load(); }
      else showToast(data.error || "Failed", "error");
    } finally { setSubmitting(false); }
  };

  const columns = [
    { header: "Shop", accessor: "name", cell: (r) => <span className="font-semibold">{r.name}</span> },
    { header: "City", accessor: "city", cell: (r) => <span className="text-xs">{r.city || "—"}</span> },
    { header: "Receivable", accessor: "balance", cell: (r) => <span className="font-mono text-xs">{formatCurrency(r.balance || 0)}</span> },
    ...(isAdmin ? [{ header: "", accessor: "id", sortable: false, cell: (row) => <DirectoryAdminActions onEdit={() => openEdit(row)} onDelete={() => handleDelete(row)} /> }] : []),
  ];

  return (
    <div className="space-y-8 page-enter">
      <DirectoryBackLink segment="Shops" />
      <PageHeader module="accounts" title="Shops / Customers" icon={Store}
        breadcrumbs={[{ label: "Project Accounts", href: "/accounts/directory" }, { label: "Shops" }]}
        actions={<><Link href="/accounts/directory"><Button variant="outline"><ArrowLeft className="w-4 h-4" /> Hub</Button></Link>
          {isAdmin && <Button onClick={openCreate} className="bg-acc-shops border-0"><Plus className="w-4 h-4" /> Add Shop</Button>}</>}
      />
      <DirectoryAdminNotice />
      <StatCard module="shops" label="Shops" value={shops.length} icon={Store} />
      <Card><CardContent>{loading ? <Loader2 className="animate-spin mx-auto" /> : <DataTable columns={columns} data={shops} onRowClick={(r) => router.push(`/shops/${r.id}`)} />}</CardContent></Card>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit shop" : "Register shop"}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input className="input-field" placeholder="Shop name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="input-field" placeholder="Owner" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
          <input className="input-field" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="input-field" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          {editingId && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>}
          <Button type="submit" disabled={submitting} className="w-full bg-acc-shops border-0">Save</Button>
        </form>
      </Modal>
    </div>
  );
}

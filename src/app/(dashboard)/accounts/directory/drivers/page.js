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
import { UserCircle, Plus, Loader2, ArrowLeft } from "lucide-react";

const emptyForm = { name: "", phone: "", cnic: "", salary: "", isActive: true };

export default function DirectoryDriversPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const isAdmin = useDirectoryAdmin();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    fetch("/api/hr/employees?role=driver")
      .then((r) => r.json())
      .then((d) => { setDrivers(d.employees || []); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      name: row.name || "",
      phone: row.phone || "",
      cnic: row.cnic || "",
      salary: row.salary != null ? String(row.salary) : "",
      isActive: row.isActive !== false,
    });
    setModalOpen(true);
  };

  const handleDelete = async (row) => {
    if (!isAdmin) return;
    if (!(await confirmDirectoryDelete(`driver "${row.name}"`))) return;
    try {
      const res = await fetch(`/api/hr/employees/${row.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast("Driver deleted", "success");
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
            cnic: form.cnic,
            salary: form.salary,
            role: "driver",
            department: "Transport",
            isActive: form.isActive,
          }
        : {
          ...form,
          role: "driver",
          department: "Transport",
          createAccount: true,
          createCashAccount: true,
          ...DIRECTORY_POST_FLAG,
        };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(editingId ? "Driver updated" : "Driver registered with transport ledger account", "success");
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
    { header: "Driver", accessor: "name", cell: (r) => <span className="font-semibold">{r.name}</span> },
    { header: "Phone", accessor: "phone", cell: (r) => <span className="text-xs">{r.phone || "—"}</span> },
    { header: "CNIC", accessor: "cnic", cell: (r) => <span className="font-mono text-xs">{r.cnic || "—"}</span> },
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
      <DirectoryBackLink segment="Drivers" />
      <PageHeader module="accounts" title="Drivers" description="Transport drivers with transport-category ledger accounts." icon={UserCircle}
        breadcrumbs={[{ label: "Project Accounts", href: "/accounts/directory" }, { label: "Drivers" }]}
        actions={
          <>
            <Link href="/accounts/directory"><Button variant="outline"><ArrowLeft className="w-4 h-4" /> Hub</Button></Link>
            {isAdmin && (
              <Button onClick={openCreate} className="bg-acc-transport border-0"><Plus className="w-4 h-4" /> Add Driver</Button>
            )}
          </>
        }
      />
      <DirectoryAdminNotice />
      <StatCard module="transport" label="Drivers" value={drivers.length} icon={UserCircle} />
      <Card><CardContent>{loading ? <Loader2 className="animate-spin mx-auto" /> : <DataTable columns={columns} data={drivers} onRowClick={(r) => router.push(`/hr/${r.id}`)} />}</CardContent></Card>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit driver" : "Register driver"}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input className="input-field" placeholder="Driver name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="input-field" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="input-field" placeholder="CNIC" value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} />
          {editingId && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Active driver
            </label>
          )}
          <Button type="submit" disabled={submitting} className="w-full bg-acc-transport border-0">{submitting ? "Saving…" : editingId ? "Save changes" : "Save"}</Button>
        </form>
      </Modal>
    </div>
  );
}

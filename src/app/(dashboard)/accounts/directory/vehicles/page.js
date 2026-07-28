"use client";

import React, { useState, useEffect } from "react";
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
import { Car, Plus, Loader2, ArrowLeft } from "lucide-react";

const VEHICLE_TYPES = ["truck", "pickup", "trailer", "dumper", "van", "other"];

const emptyForm = {
  registrationNumber: "", vehicleType: "truck", capacity: "", driverName: "", driverPhone: "", isOwned: true, linkDriverAccount: true, isActive: true,
};

export default function DirectoryVehiclesPage() {
  const { showToast } = useToast();
  const isAdmin = useDirectoryAdmin();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    fetch("/api/transport/vehicles")
      .then((r) => r.json())
      .then((d) => { setVehicles(d.vehicles || []); setLoading(false); });
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
      registrationNumber: row.registrationNumber || "",
      vehicleType: row.vehicleType || "truck",
      capacity: row.capacity != null ? String(row.capacity) : "",
      driverName: row.driverName || "",
      driverPhone: row.driverPhone || "",
      isOwned: row.isOwned !== false,
      linkDriverAccount: false,
      isActive: row.isActive !== false,
    });
    setModalOpen(true);
  };

  const handleDelete = async (row) => {
    if (!isAdmin) return;
    if (!(await confirmDirectoryDelete(`vehicle "${row.registrationNumber}"`))) return;
    try {
      const res = await fetch(`/api/transport/vehicles/${row.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast("Vehicle deleted", "success");
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
      const url = editingId ? `/api/transport/vehicles/${editingId}` : "/api/transport/vehicles";
      const method = editingId ? "PUT" : "POST";
      const payload = editingId
        ? {
            registrationNumber: form.registrationNumber,
            vehicleType: form.vehicleType,
            capacity: form.capacity,
            driverName: form.driverName,
            driverPhone: form.driverPhone,
            isOwned: form.isOwned,
            isActive: form.isActive,
          }
        : { ...form, ...DIRECTORY_POST_FLAG };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(editingId ? "Vehicle updated" : "Vehicle registered", "success");
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
    { header: "Registration", accessor: "registrationNumber", cell: (r) => <span className="font-mono font-semibold">{r.registrationNumber}</span> },
    { header: "Type", accessor: "vehicleType", cell: (r) => <span className="text-xs capitalize">{r.vehicleType}</span> },
    { header: "Driver", accessor: "driverName", cell: (r) => <span className="text-xs">{r.driverName || "—"}</span> },
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
      <DirectoryBackLink segment="Vehicles" />
      <PageHeader module="accounts" title="Vehicles" description="Fleet master data; optional driver transport ledger per vehicle." icon={Car}
        breadcrumbs={[{ label: "Project Accounts", href: "/accounts/directory" }, { label: "Vehicles" }]}
        actions={
          <>
            <Link href="/accounts/directory"><Button variant="outline"><ArrowLeft className="w-4 h-4" /> Hub</Button></Link>
            {isAdmin && (
              <Button onClick={openCreate} className="bg-acc-transport border-0"><Plus className="w-4 h-4" /> Add Vehicle</Button>
            )}
          </>
        }
      />
      <DirectoryAdminNotice />
      <StatCard module="transport" label="Vehicles" value={vehicles.length} icon={Car} />
      <Card><CardContent>{loading ? <Loader2 className="animate-spin mx-auto" /> : <DataTable columns={columns} data={vehicles} />}</CardContent></Card>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit vehicle" : "Register vehicle"}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input className="input-field" placeholder="Registration # *" value={form.registrationNumber} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} required />
          <select className="input-field" value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}>
            {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input className="input-field" placeholder="Driver name" value={form.driverName} onChange={(e) => setForm({ ...form, driverName: e.target.value })} />
          <input className="input-field" placeholder="Driver phone" value={form.driverPhone} onChange={(e) => setForm({ ...form, driverPhone: e.target.value })} />
          {!editingId && (
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={form.linkDriverAccount} onChange={(e) => setForm({ ...form, linkDriverAccount: e.target.checked })} />
              Create transport ledger account for driver on this vehicle
            </label>
          )}
          {editingId && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Active vehicle
            </label>
          )}
          <Button type="submit" disabled={submitting} className="w-full bg-acc-transport border-0">{submitting ? "Saving…" : editingId ? "Save changes" : "Save"}</Button>
        </form>
      </Modal>
    </div>
  );
}

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
import { Building2, Plus, Loader2, ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

const TYPE_LABELS = { supplier: "Supplier", buyer: "Buyer", both: "Both" };
const emptyForm = {
  name: "", contactPerson: "", phone: "", city: "", companyType: "both", notes: "", isActive: true,
};

export default function DirectoryCompaniesPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const isAdmin = useDirectoryAdmin();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    fetch("/api/companies").then((r) => r.json()).then((d) => { setCompanies(d.companies || []); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      name: row.name || "", contactPerson: row.contactPerson || "", phone: row.phone || "",
      city: row.city || "", companyType: row.companyType || "both", notes: row.notes || "",
      isActive: row.isActive !== false,
    });
    setModalOpen(true);
  };

  const handleDelete = async (row) => {
    if (!(await confirmDirectoryDelete(`company "${row.name}"`))) return;
    const res = await fetch(`/api/companies/${row.id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) { showToast("Company deleted", "success"); load(); }
    else showToast(data.error || "Delete failed", "error");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(editingId ? `/api/companies/${editingId}` : "/api/companies", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? form : { ...form, ...DIRECTORY_POST_FLAG }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(editingId ? "Company updated" : "Company registered", "success");
        setModalOpen(false);
        load();
      } else showToast(data.error || "Failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { header: "Company", accessor: "name", cell: (r) => <span className="font-semibold">{r.name}</span> },
    { header: "Type", accessor: "companyType", cell: (r) => <Badge variant="info">{TYPE_LABELS[r.companyType] || r.companyType}</Badge> },
    { header: "Balance", accessor: "balance", cell: (r) => <span className="font-mono text-xs">{formatCurrency(r.balance || 0)}</span> },
    ...(isAdmin ? [{
      header: "", accessor: "id", sortable: false,
      cell: (row) => <DirectoryAdminActions onEdit={() => openEdit(row)} onDelete={() => handleDelete(row)} />,
    }] : []),
  ];

  return (
    <div className="space-y-8 page-enter">
      <DirectoryBackLink segment="Companies" />
      <PageHeader module="accounts" title="Companies" description="Suppliers, buyers, or both." icon={Building2}
        breadcrumbs={[{ label: "Project Accounts", href: "/accounts/directory" }, { label: "Companies" }]}
        actions={<><Link href="/accounts/directory"><Button variant="outline"><ArrowLeft className="w-4 h-4" /> Hub</Button></Link>
          {isAdmin && <Button onClick={openCreate} className="bg-acc-companies border-0"><Plus className="w-4 h-4" /> Add Company</Button>}</>}
      />
      <DirectoryAdminNotice />
      <StatCard module="companies" label="Companies" value={companies.length} icon={Building2} />
      <Card><CardContent>{loading ? <Loader2 className="animate-spin mx-auto" /> : <DataTable columns={columns} data={companies} onRowClick={(r) => router.push(`/companies/${r.id}`)} />}</CardContent></Card>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit company" : "Register company"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <input className="input-field" placeholder="Company name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <select className="input-field" value={form.companyType} onChange={(e) => setForm({ ...form, companyType: e.target.value })}>
            <option value="supplier">Supplier</option><option value="buyer">Buyer</option><option value="both">Both</option>
          </select>
          <input className="input-field" placeholder="Contact person" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
          <input className="input-field" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="input-field" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          {editingId && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active
            </label>
          )}
          <Button type="submit" disabled={submitting} className="w-full bg-acc-companies border-0">{editingId ? "Save changes" : "Save"}</Button>
        </form>
      </Modal>
    </div>
  );
}

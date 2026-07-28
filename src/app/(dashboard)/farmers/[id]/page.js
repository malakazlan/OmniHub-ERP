"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, StatCard } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/Button";
import { DataTable } from "@/components/ui/DataTable";
import {
  Sprout, Loader2, ArrowLeft, Pencil, Trash2, MapPin, Phone,
  Wallet, ShoppingCart, Landmark, StickyNote,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

function DetailRow({ label, value, mono = false }) {
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <span className={`text-xs font-semibold text-slate-900 text-right ${mono ? "font-mono" : ""}`}>{value || "—"}</span>
    </div>
  );
}

export default function FarmerDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [farmer, setFarmer] = useState(null);
  const [balance, setBalance] = useState(0);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(null);

  const fetchFarmer = async () => {
    try {
      const res = await fetch(`/api/farmers/${id}`);
      const data = await res.json();
      if (res.ok) {
        setFarmer(data.farmer);
        setBalance(data.balance || 0);
        setLedgerEntries(data.ledgerEntries || []);
      } else {
        showToast(data.error || "Failed to load farmer", "error");
      }
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchFarmer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const openEdit = () => {
    setForm({
      name: farmer.name || "", fatherName: farmer.fatherName || "", cnic: farmer.cnic || "",
      phone: farmer.phone || "", whatsappNumber: farmer.whatsappNumber || "", city: farmer.city || "",
      village: farmer.village || "", address: farmer.address || "", bankName: farmer.bankName || "",
      bankAccountNo: farmer.bankAccountNo || "", notes: farmer.notes || "", isActive: farmer.isActive,
    });
    setModalOpen(true);
  };

  const handleChange = (field) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm({ ...form, [field]: val });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) { showToast("Farmer name is required", "warning"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/farmers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Farmer updated!", "success");
        setModalOpen(false);
        fetchFarmer();
      } else showToast(data.error || "Failed to update farmer", "error");
    } catch {
      showToast("Error processing request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete farmer "${farmer.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/farmers/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast("Farmer deleted", "success");
        router.push("/farmers");
      } else showToast(data.error || "Failed to delete farmer", "error");
    } catch {
      showToast("Error processing request", "error");
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center page-enter">
        <Loader2 className="w-8 h-8 text-acc-farmers animate-spin" />
      </div>
    );
  }

  if (!farmer) {
    return (
      <div className="page-enter space-y-6">
        <PageHeader module="farmers" title="Farmer Not Found" icon={Sprout} breadcrumbs={[{ label: "Farmers", href: "/farmers" }, { label: "Not Found" }]} />
        <Card><CardContent className="py-12 text-center">
          <p className="text-slate-500 mb-4">This farmer could not be found.</p>
          <Link href="/farmers"><Button variant="outline" className="border-slate-200 text-slate-700"><ArrowLeft className="w-4 h-4" /> Back to Farmers</Button></Link>
        </CardContent></Card>
      </div>
    );
  }

  const purchaseColumns = [
    { header: "Purchase #", accessor: "purchaseNumber", cell: (row) => <span className="font-mono text-xs font-semibold text-acc-farmers">{row.purchaseNumber}</span> },
    { header: "Date", accessor: "purchaseDate", cell: (row) => <span className="text-xs text-slate-500">{formatDate(row.purchaseDate)}</span> },
    { header: "Total", accessor: "totalAmount", cell: (row) => <span className="font-mono text-xs font-bold text-slate-900">{formatCurrency(row.totalAmount)}</span> },
    { header: "Paid", accessor: "paidAmount", cell: (row) => <span className="font-mono text-xs text-emerald-600">{formatCurrency(row.paidAmount)}</span> },
    { header: "Status", accessor: "status", cell: (row) => <Badge variant={row.status === "cancelled" ? "danger" : "success"} className="capitalize">{row.status}</Badge> },
  ];

  const ledgerColumns = [
    { header: "Date", accessor: "date", cell: (row) => <span className="text-xs text-slate-500">{formatDate(row.date)}</span> },
    { header: "Description", accessor: "description", cell: (row) => <span className="text-sm text-slate-800">{row.description}</span> },
    { header: "Debit", accessor: "debit", cell: (row) => row.debit > 0 ? <span className="font-mono text-xs font-bold text-red-500">{formatCurrency(row.debit)}</span> : <span className="text-slate-300">—</span> },
    { header: "Credit", accessor: "credit", cell: (row) => row.credit > 0 ? <span className="font-mono text-xs font-bold text-emerald-600">{formatCurrency(row.credit)}</span> : <span className="text-slate-300">—</span> },
    { header: "Balance", accessor: "balance", cell: (row) => <span className="font-mono text-xs font-bold text-slate-900">{formatCurrency(row.balance)}</span> },
  ];

  return (
    <div className="space-y-8 page-enter pb-10">
      <PageHeader
        module="farmers"
        title={farmer.name}
        description={farmer.village ? `${farmer.village}, ${farmer.city || ""}` : farmer.city || "Farmer profile & ledger"}
        icon={Sprout}
        breadcrumbs={[{ label: "Farmers", href: "/farmers" }, { label: farmer.name }]}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={farmer.isActive ? "success" : "neutral"}>{farmer.isActive ? "Active" : "Suspended"}</Badge>
            <Button variant="outline" onClick={openEdit} className="border-slate-200 text-slate-700"><Pencil className="w-4 h-4" /> Edit</Button>
            {user?.role === "admin" && (
              <Button variant="outline" onClick={handleDelete} className="border-red-200 text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /> Delete</Button>
            )}
            <Link href="/farmers"><Button variant="outline" className="border-slate-200 text-slate-700"><ArrowLeft className="w-4 h-4" /> Back</Button></Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          module="farmers"
          label={balance > 0 ? "Credit Balance" : "Payable Balance"}
          value={formatCurrency(Math.abs(balance))}
          icon={Wallet}
          valueClassName={balance < 0 ? "text-red-500" : balance > 0 ? "text-emerald-600" : ""}
        />
        <StatCard module="farmers" label="Total Purchases" value={(farmer.purchases || []).length} icon={ShoppingCart} />
        <StatCard module="farmers" label="Ledger Entries" value={ledgerEntries.length} icon={Landmark} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card>
            <CardHeader><h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-acc-farmers" /> Recent Purchases</h2></CardHeader>
            <CardContent>
              {(farmer.purchases || []).length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">No purchases recorded yet.</p>
              ) : (
                <DataTable columns={purchaseColumns} data={farmer.purchases} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Landmark className="w-4 h-4 text-acc-farmers" /> Ledger</h2></CardHeader>
            <CardContent>
              {ledgerEntries.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">No ledger entries yet.</p>
              ) : (
                <DataTable columns={ledgerColumns} data={ledgerEntries} />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Phone className="w-4 h-4 text-acc-farmers" /> Contact</h2></CardHeader>
            <CardContent>
              <DetailRow label="Father's Name" value={farmer.fatherName} />
              <DetailRow label="CNIC" value={farmer.cnic} mono />
              <DetailRow label="Phone" value={farmer.phone} />
              <DetailRow label="WhatsApp" value={farmer.whatsappNumber} />
              <DetailRow label="City" value={farmer.city} />
              <DetailRow label="Village" value={farmer.village} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><MapPin className="w-4 h-4 text-acc-farmers" /> Address & Bank</h2></CardHeader>
            <CardContent>
              <DetailRow label="Address" value={farmer.address} />
              <DetailRow label="Bank" value={farmer.bankName} />
              <DetailRow label="Account No." value={farmer.bankAccountNo} mono />
            </CardContent>
          </Card>

          {farmer.notes && (
            <Card>
              <CardHeader><h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><StickyNote className="w-4 h-4 text-acc-farmers" /> Notes</h2></CardHeader>
              <CardContent><p className="text-sm text-slate-600 whitespace-pre-wrap">{farmer.notes}</p></CardContent>
            </Card>
          )}
        </div>
      </div>

      {form && (
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Edit Farmer" size="lg">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 md:col-span-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Farmer Name *</label>
                <input type="text" value={form.name} onChange={handleChange("name")} required className="input-field" />
              </div>
              {[
                ["fatherName", "Father's Name"], ["cnic", "CNIC"], ["phone", "Phone"],
                ["whatsappNumber", "WhatsApp"], ["city", "City"], ["village", "Village"],
                ["bankName", "Bank Name"], ["bankAccountNo", "Account No."],
              ].map(([key, label]) => (
                <div key={key} className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</label>
                  <input type="text" value={form[key]} onChange={handleChange(key)} className="input-field" />
                </div>
              ))}
              <div className="space-y-1 md:col-span-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Address</label>
                <textarea value={form.address} onChange={handleChange("address")} className="input-field h-16 resize-none" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Notes</label>
                <textarea value={form.notes} onChange={handleChange("notes")} className="input-field h-16 resize-none" />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={form.isActive} onChange={handleChange("isActive")} className="rounded border-slate-300" />
                  Active
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-800 border border-slate-200 cursor-pointer transition-colors">Cancel</button>
              <Button type="submit" disabled={submitting} className="bg-acc-farmers hover:bg-emerald-600 border-0">
                {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving...</> : "Save Changes"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

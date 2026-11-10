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
import LedgerTable from "@/components/accounts/LedgerTable";
import {
  Building2, Loader2, ArrowLeft, Pencil, Trash2, MapPin, Phone,
  Wallet, ShoppingCart, DollarSign, Landmark, StickyNote,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { COMPANY_TYPE_LABELS } from "@/lib/constants";

function DetailRow({ label, value, mono = false }) {
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <span className={`text-xs font-semibold text-slate-900 text-right ${mono ? "font-mono" : ""}`}>{value || "—"}</span>
    </div>
  );
}

export default function CompanyDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [company, setCompany] = useState(null);
  const [balance, setBalance] = useState(0);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(null);

  const fetchCompany = async () => {
    try {
      const res = await fetch(`/api/companies/${id}`);
      const data = await res.json();
      if (res.ok) {
        setCompany(data.company);
        setBalance(data.balance || 0);
        setLedgerEntries(data.ledgerEntries || []);
      } else {
        showToast(data.error || "Failed to load account", "error");
      }
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchCompany();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const openEdit = () => {
    setForm({
      name: company.name || "", contactPerson: company.contactPerson || "", phone: company.phone || "",
      whatsappNumber: company.whatsappNumber || "", email: company.email || "", ntn: company.ntn || "",
      strn: company.strn || "", city: company.city || "", address: company.address || "",
      companyType: company.companyType || "both", bankName: company.bankName || "", bankAccountNo: company.bankAccountNo || "",
      creditLimit: company.creditLimit ?? "", notes: company.notes || "", isActive: company.isActive,
    });
    setModalOpen(true);
  };

  const handleChange = (field) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm({ ...form, [field]: val });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) { showToast("Name is required", "warning"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/companies/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Account updated!", "success");
        setModalOpen(false);
        fetchCompany();
      } else showToast(data.error || "Failed to update account", "error");
    } catch {
      showToast("Error processing request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${company.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/companies/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast("Account deleted", "success");
        router.push("/companies");
      } else showToast(data.error || "Failed to delete account", "error");
    } catch {
      showToast("Error processing request", "error");
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center page-enter">
        <Loader2 className="w-8 h-8 text-acc-companies animate-spin" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="page-enter space-y-6">
        <PageHeader module="companies" title="Account Not Found" icon={Building2} breadcrumbs={[{ label: "Customers & Vendors", href: "/companies" }, { label: "Not Found" }]} />
        <Card><CardContent className="py-12 text-center">
          <p className="text-slate-500 mb-4">This customer or vendor could not be found.</p>
          <Link href="/companies"><Button variant="outline" className="border-slate-200 text-slate-700"><ArrowLeft className="w-4 h-4" /> Back to Customers & Vendors</Button></Link>
        </CardContent></Card>
      </div>
    );
  }

  const orderColumns = (numberKey, dateKey) => [
    { header: "Doc #", accessor: numberKey, cell: (row) => <span className="font-mono text-xs font-semibold text-acc-companies">{row[numberKey]}</span> },
    { header: "Date", accessor: dateKey, cell: (row) => <span className="text-xs text-slate-500">{formatDate(row[dateKey])}</span> },
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
        module="companies"
        title={company.name}
        description={company.contactPerson || company.city || "Account profile & ledger"}
        icon={Building2}
        breadcrumbs={[{ label: "Customers & Vendors", href: "/companies" }, { label: company.name }]}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={company.companyType === "both" ? "info" : company.companyType === "supplier" ? "warning" : "success"}>
              {COMPANY_TYPE_LABELS[company.companyType] || company.companyType}
            </Badge>
            <Badge variant={company.isActive ? "success" : "neutral"}>{company.isActive ? "Active" : "Suspended"}</Badge>
            <Button variant="outline" onClick={openEdit} className="border-slate-200 text-slate-700"><Pencil className="w-4 h-4" /> Edit</Button>
            {user?.role === "admin" && (
              <Button variant="outline" onClick={handleDelete} className="border-red-200 text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /> Delete</Button>
            )}
            <Link href="/companies"><Button variant="outline" className="border-slate-200 text-slate-700"><ArrowLeft className="w-4 h-4" /> Back</Button></Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard module="companies" label="Net Balance" value={formatCurrency(balance)} icon={Wallet} />
        <StatCard module="companies" label="Bills" value={(company.purchaseOrders || []).length} icon={ShoppingCart} />
        <StatCard module="companies" label="Invoices" value={(company.saleOrders || []).length} icon={DollarSign} />
        <StatCard module="companies" label="Credit Limit" value={formatCurrency(company.creditLimit)} icon={Landmark} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card>
            <CardHeader><h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-acc-companies" /> Recent Bills</h2></CardHeader>
            <CardContent>
              {(company.purchaseOrders || []).length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">No bills recorded yet.</p>
              ) : (
                <DataTable columns={orderColumns("purchaseNumber", "purchaseDate")} data={company.purchaseOrders} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><DollarSign className="w-4 h-4 text-acc-companies" /> Recent Invoices</h2></CardHeader>
            <CardContent>
              {(company.saleOrders || []).length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">No invoices recorded yet.</p>
              ) : (
                <DataTable columns={orderColumns("saleNumber", "saleDate")} data={company.saleOrders} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Landmark className="w-4 h-4 text-acc-companies" /> Ledger</h2></CardHeader>
            <CardContent>
              {ledgerEntries.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">No ledger entries yet.</p>
              ) : (
                <LedgerTable columns={ledgerColumns} data={ledgerEntries} />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Phone className="w-4 h-4 text-acc-companies" /> Contact</h2></CardHeader>
            <CardContent>
              <DetailRow label="Contact Person" value={company.contactPerson} />
              <DetailRow label="Phone" value={company.phone} />
              <DetailRow label="WhatsApp" value={company.whatsappNumber} />
              <DetailRow label="Email" value={company.email} />
              <DetailRow label="City" value={company.city} />
              <DetailRow label="EIN / Tax ID" value={company.ntn} mono />
              <DetailRow label="State Tax ID" value={company.strn} mono />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><MapPin className="w-4 h-4 text-acc-companies" /> Address & Bank</h2></CardHeader>
            <CardContent>
              <DetailRow label="Address" value={company.address} />
              <DetailRow label="Bank" value={company.bankName} />
              <DetailRow label="Account No." value={company.bankAccountNo} mono />
            </CardContent>
          </Card>

          {company.notes && (
            <Card>
              <CardHeader><h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><StickyNote className="w-4 h-4 text-acc-companies" /> Notes</h2></CardHeader>
              <CardContent><p className="text-sm text-slate-600 whitespace-pre-wrap">{company.notes}</p></CardContent>
            </Card>
          )}
        </div>
      </div>

      {form && (
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Edit Account" size="lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold text-slate-500">Name *</label>
                <input type="text" value={form.name} onChange={handleChange("name")} required className="input-field text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Contact Person</label>
                <input type="text" value={form.contactPerson} onChange={handleChange("contactPerson")} className="input-field text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Relationship</label>
                <select value={form.companyType} onChange={handleChange("companyType")} className="input-field text-xs">
                  <option value="both">Customer & Vendor</option>
                  <option value="supplier">Vendor</option>
                  <option value="buyer">Customer</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Phone</label>
                <input type="text" value={form.phone} onChange={handleChange("phone")} className="input-field text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">WhatsApp</label>
                <input type="text" value={form.whatsappNumber} onChange={handleChange("whatsappNumber")} className="input-field text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Email</label>
                <input type="email" value={form.email} onChange={handleChange("email")} className="input-field text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">City</label>
                <input type="text" value={form.city} onChange={handleChange("city")} className="input-field text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">EIN / Tax ID</label>
                <input type="text" value={form.ntn} onChange={handleChange("ntn")} className="input-field text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Credit Limit ($)</label>
                <input type="number" value={form.creditLimit} onChange={handleChange("creditLimit")} className="input-field text-xs" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold text-slate-500">Address</label>
                <textarea value={form.address} onChange={handleChange("address")} className="input-field text-xs h-16 resize-none" />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={form.isActive} onChange={handleChange("isActive")} className="rounded border-slate-300" />
                  Active
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 rounded-xl text-xs font-semibold cursor-pointer transition-colors">Cancel</button>
              <Button type="submit" disabled={submitting} className="bg-acc-companies hover:bg-blue-600">
                {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving...</> : "Save Changes"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

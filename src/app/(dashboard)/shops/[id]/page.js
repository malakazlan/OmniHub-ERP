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
  Store, Loader2, ArrowLeft, Pencil, Trash2, MapPin, Phone,
  Wallet, DollarSign, Landmark, StickyNote,
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

export default function ShopDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [shop, setShop] = useState(null);
  const [balance, setBalance] = useState(0);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(null);
  const [dealers, setDealers] = useState([]);

  const fetchShop = async () => {
    try {
      const res = await fetch(`/api/shops/${id}`);
      const data = await res.json();
      if (res.ok) {
        setShop(data.shop);
        setBalance(data.balance || 0);
        setLedgerEntries(data.ledgerEntries || []);
      } else {
        showToast(data.error || "Failed to load shop", "error");
      }
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchShop();
    fetch("/api/dealers")
      .then((r) => r.json())
      .then((d) => setDealers((d.dealers || []).filter((dealer) => dealer.isActive !== false)))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const openEdit = () => {
    setForm({
      name: shop.name || "", ownerName: shop.ownerName || "", phone: shop.phone || "",
      whatsappNumber: shop.whatsappNumber || "", city: shop.city || "", area: shop.area || "",
      address: shop.address || "", shopType: shop.shopType || "retail", creditLimit: shop.creditLimit ?? "",
      dealerId: shop.dealerId ? String(shop.dealerId) : "",
      notes: shop.notes || "", isActive: shop.isActive,
    });
    setModalOpen(true);
  };

  const handleChange = (field) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm({ ...form, [field]: val });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) { showToast("Shop name is required", "warning"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/shops/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Shop updated!", "success");
        setModalOpen(false);
        fetchShop();
      } else showToast(data.error || "Failed to update shop", "error");
    } catch {
      showToast("Error processing request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete shop "${shop.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/shops/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast("Shop deleted", "success");
        router.push("/shops");
      } else showToast(data.error || "Failed to delete shop", "error");
    } catch {
      showToast("Error processing request", "error");
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center page-enter">
        <Loader2 className="w-8 h-8 text-acc-shops animate-spin" />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="page-enter space-y-6">
        <PageHeader module="shops" title="Shop Not Found" icon={Store} breadcrumbs={[{ label: "Shops", href: "/shops" }, { label: "Not Found" }]} />
        <Card><CardContent className="py-12 text-center">
          <p className="text-slate-500 mb-4">This shop could not be found.</p>
          <Link href="/shops"><Button variant="outline" className="border-slate-200 text-slate-700"><ArrowLeft className="w-4 h-4" /> Back to Shops</Button></Link>
        </CardContent></Card>
      </div>
    );
  }

  const saleColumns = [
    { header: "Sale #", accessor: "saleNumber", cell: (row) => <span className="font-mono text-xs font-semibold text-acc-shops">{row.saleNumber}</span> },
    { header: "Date", accessor: "saleDate", cell: (row) => <span className="text-xs text-slate-500">{formatDate(row.saleDate)}</span> },
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
        module="shops"
        title={shop.name}
        description={shop.ownerName ? `Owner: ${shop.ownerName}` : shop.city || "Shop profile & ledger"}
        icon={Store}
        breadcrumbs={[{ label: "Shops", href: "/shops" }, { label: shop.name }]}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="info">{shop.shopType || "retail"}</Badge>
            <Badge variant={shop.isActive ? "success" : "neutral"}>{shop.isActive ? "Active" : "Suspended"}</Badge>
            <Button variant="outline" onClick={openEdit} className="border-slate-200 text-slate-700"><Pencil className="w-4 h-4" /> Edit</Button>
            {user?.role === "admin" && (
              <Button variant="outline" onClick={handleDelete} className="border-red-200 text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /> Delete</Button>
            )}
            <Link href="/shops"><Button variant="outline" className="border-slate-200 text-slate-700"><ArrowLeft className="w-4 h-4" /> Back</Button></Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard module="shops" label="Receivable Balance" value={formatCurrency(balance)} icon={Wallet} valueClassName={balance > 0 ? "text-red-500" : ""} />
        <StatCard module="shops" label="Sale Orders" value={(shop.saleOrders || []).length} icon={DollarSign} />
        <StatCard module="shops" label="Credit Limit" value={formatCurrency(shop.creditLimit)} icon={Landmark} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card>
            <CardHeader><h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><DollarSign className="w-4 h-4 text-acc-shops" /> Recent Sales</h2></CardHeader>
            <CardContent>
              {(shop.saleOrders || []).length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">No sales recorded yet.</p>
              ) : (
                <DataTable columns={saleColumns} data={shop.saleOrders} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Landmark className="w-4 h-4 text-acc-shops" /> Ledger</h2></CardHeader>
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
            <CardHeader><h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Phone className="w-4 h-4 text-acc-shops" /> Contact</h2></CardHeader>
            <CardContent>
              <DetailRow label="Owner" value={shop.ownerName} />
              <DetailRow label="Phone" value={shop.phone} />
              <DetailRow label="WhatsApp" value={shop.whatsappNumber} />
              <DetailRow label="City" value={shop.city} />
              <DetailRow label="Area" value={shop.area} />
              <DetailRow
                label="Dealer"
                value={
                  shop.dealer ? (
                    <Link href={`/dealers/${shop.dealer.id}`} className="text-violet-600 hover:underline">
                      {shop.dealer.name}
                    </Link>
                  ) : "—"
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><MapPin className="w-4 h-4 text-acc-shops" /> Address</h2></CardHeader>
            <CardContent>
              <DetailRow label="Address" value={shop.address} />
            </CardContent>
          </Card>

          {shop.notes && (
            <Card>
              <CardHeader><h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><StickyNote className="w-4 h-4 text-acc-shops" /> Notes</h2></CardHeader>
              <CardContent><p className="text-sm text-slate-600 whitespace-pre-wrap">{shop.notes}</p></CardContent>
            </Card>
          )}
        </div>
      </div>

      {form && (
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Edit Shop" size="lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Shop Name *</label>
                <input type="text" value={form.name} onChange={handleChange("name")} required className="input-field text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Owner Name</label>
                <input type="text" value={form.ownerName} onChange={handleChange("ownerName")} className="input-field text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Shop Type</label>
                <select value={form.shopType} onChange={handleChange("shopType")} className="input-field text-xs">
                  <option value="retail">Retail</option>
                  <option value="wholesale">Wholesale</option>
                  <option value="distributor">Distributor</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Credit Limit (₨)</label>
                <input type="number" value={form.creditLimit} onChange={handleChange("creditLimit")} className="input-field text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Dealer</label>
                <select value={form.dealerId} onChange={handleChange("dealerId")} className="input-field text-xs">
                  <option value="">No dealer assigned</option>
                  {dealers.map((d) => (
                    <option key={d.id} value={String(d.id)}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Phone</label>
                <input type="text" value={form.phone} onChange={handleChange("phone")} className="input-field text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">City</label>
                <input type="text" value={form.city} onChange={handleChange("city")} className="input-field text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Area</label>
                <input type="text" value={form.area} onChange={handleChange("area")} className="input-field text-xs" />
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
              <Button type="submit" disabled={submitting} className="bg-acc-shops hover:bg-amber-600">
                {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving...</> : "Save Changes"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

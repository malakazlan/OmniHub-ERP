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
  Package, Loader2, ArrowLeft, Pencil, Trash2, AlertTriangle,
  Boxes, DollarSign, TrendingUp,
} from "lucide-react";
import { formatCurrency, formatQuantity, formatDateTime } from "@/lib/formatters";

const MOVEMENT_LABELS = {
  purchase_in: { label: "Purchase In", variant: "success" },
  sale_out: { label: "Sale Out", variant: "danger" },
  return_in: { label: "Return In", variant: "info" },
  return_out: { label: "Return Out", variant: "warning" },
  adjustment: { label: "Adjustment", variant: "neutral" },
  transfer: { label: "Transfer", variant: "info" },
};

function DetailRow({ label, value, mono = false }) {
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <span className={`text-xs font-semibold text-slate-900 text-right ${mono ? "font-mono" : ""}`}>{value ?? "—"}</span>
    </div>
  );
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(null);

  const fetchProduct = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch(`/api/products/${id}`),
        fetch("/api/products/categories"),
      ]);
      const data = await prodRes.json();
      const catData = await catRes.json();
      if (prodRes.ok) setProduct(data.product);
      else showToast(data.error || "Failed to load product", "error");
      if (catRes.ok) setCategories(catData.categories || []);
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const openEdit = () => {
    setForm({
      name: product.name || "", categoryId: product.categoryId || "", unit: product.unit || "kg",
      bagWeight: product.bagWeight ?? "34", costPrice: product.costPrice ?? "", salePrice: product.salePrice ?? "",
      minimumStock: product.minimumStock ?? "", description: product.description || "", isActive: product.isActive,
    });
    setModalOpen(true);
  };

  const handleChange = (field) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm({ ...form, [field]: val });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.categoryId) { showToast("Product name and category are required", "warning"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Product updated!", "success");
        setModalOpen(false);
        fetchProduct();
      } else showToast(data.error || "Failed to update product", "error");
    } catch {
      showToast("Error processing request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete product "${product.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "Product removed", "success");
        router.push("/products");
      } else showToast(data.error || "Failed to delete product", "error");
    } catch {
      showToast("Error processing request", "error");
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center page-enter">
        <Loader2 className="w-8 h-8 text-acc-products animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="page-enter space-y-6">
        <PageHeader module="products" title="Product Not Found" icon={Package} breadcrumbs={[{ label: "Products", href: "/products" }, { label: "Not Found" }]} />
        <Card><CardContent className="py-12 text-center">
          <p className="text-slate-500 mb-4">This product could not be found.</p>
          <Link href="/products"><Button variant="outline" className="border-slate-200 text-slate-700"><ArrowLeft className="w-4 h-4" /> Back to Products</Button></Link>
        </CardContent></Card>
      </div>
    );
  }

  const isLow = product.currentStock <= product.minimumStock;
  const stockValue = (product.currentStock || 0) * (product.costPrice || 0);

  const movementColumns = [
    { header: "Date", accessor: "createdAt", cell: (row) => <span className="text-xs text-slate-500">{formatDateTime(row.createdAt)}</span> },
    {
      header: "Type", accessor: "movementType",
      cell: (row) => {
        const m = MOVEMENT_LABELS[row.movementType] || { label: row.movementType, variant: "neutral" };
        return <Badge variant={m.variant}>{m.label}</Badge>;
      },
    },
    { header: "Quantity", accessor: "quantity", cell: (row) => <span className="font-mono text-xs font-bold text-slate-900">{formatQuantity(row.quantity, product.unit)}</span> },
    { header: "Before → After", accessor: "newStock", cell: (row) => <span className="font-mono text-xs text-slate-500">{formatQuantity(row.previousStock, product.unit)} → {formatQuantity(row.newStock, product.unit)}</span> },
    { header: "Notes", accessor: "notes", cell: (row) => <span className="text-xs text-slate-500">{row.notes || "—"}</span> },
  ];

  return (
    <div className="space-y-8 page-enter pb-10">
      <PageHeader
        module="products"
        title={product.name}
        description={product.sku ? `SKU: ${product.sku}` : "Product profile & stock history"}
        icon={Package}
        breadcrumbs={[{ label: "Products", href: "/products" }, { label: product.name }]}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="info">{product.category?.name || "—"}</Badge>
            <Badge variant={product.isActive ? "success" : "neutral"}>{product.isActive ? "Active" : "Inactive"}</Badge>
            <Button variant="outline" onClick={openEdit} className="border-slate-200 text-slate-700"><Pencil className="w-4 h-4" /> Edit</Button>
            {user?.role === "admin" && (
              <Button variant="outline" onClick={handleDelete} className="border-red-200 text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /> Delete</Button>
            )}
            <Link href="/products"><Button variant="outline" className="border-slate-200 text-slate-700"><ArrowLeft className="w-4 h-4" /> Back</Button></Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          module="products" label="Current Stock" icon={Boxes}
          value={formatQuantity(product.currentStock, product.unit)}
          valueClassName={isLow ? "text-red-500" : "text-emerald-600"}
          subtext={isLow ? "Below minimum threshold" : undefined}
        />
        <StatCard module="products" label="Cost Price" value={formatCurrency(product.costPrice)} icon={DollarSign} />
        <StatCard module="products" label="Sale Price" value={formatCurrency(product.salePrice)} icon={TrendingUp} />
        <StatCard module="products" label="Stock Value" value={formatCurrency(stockValue)} icon={AlertTriangle} valueClassName={isLow ? "text-red-500" : ""} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card>
            <CardHeader><h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Boxes className="w-4 h-4 text-acc-products" /> Stock Movement History</h2></CardHeader>
            <CardContent>
              {(product.stockMovements || []).length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">No stock movements recorded yet.</p>
              ) : (
                <DataTable columns={movementColumns} data={product.stockMovements} />
              )}
            </CardContent>
          </Card>

          {product.description && (
            <Card>
              <CardHeader><h2 className="text-sm font-bold text-slate-900">Description</h2></CardHeader>
              <CardContent><p className="text-sm text-slate-600 whitespace-pre-wrap">{product.description}</p></CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Package className="w-4 h-4 text-acc-products" /> Details</h2></CardHeader>
            <CardContent>
              <DetailRow label="SKU" value={product.sku} mono />
              <DetailRow label="Category" value={product.category?.name} />
              <DetailRow label="Unit" value={product.unit} />
              {product.unit === "bag" && <DetailRow label="Bag Weight" value={`${product.bagWeight || 34} kg`} />}
              <DetailRow label="Minimum Stock" value={formatQuantity(product.minimumStock, product.unit)} />
            </CardContent>
          </Card>
        </div>
      </div>

      {form && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Edit Product"
          size="md"
          footer={
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white cursor-pointer"
              >
                Cancel
              </button>
              <Button type="submit" form="edit-product-form" disabled={submitting} className="bg-acc-products hover:bg-violet-600 border-0 px-5 py-2 text-sm">
                {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving…</> : "Save Changes"}
              </Button>
            </div>
          }
        >
          <form id="edit-product-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold text-slate-500">Product Name *</label>
                <input type="text" value={form.name} onChange={handleChange("name")} required className="input-field text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Category *</label>
                <select value={form.categoryId} onChange={handleChange("categoryId")} required className="input-field text-xs">
                  <option value="">Select category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Unit</label>
                <select value={form.unit} onChange={handleChange("unit")} className="input-field text-xs">
                  <option value="kg">Kilogram (Kg)</option>
                  <option value="ton">Ton</option>
                  <option value="bag">Bag</option>
                  <option value="piece">Piece</option>
                </select>
              </div>
              {form.unit === "bag" && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Bag Weight (Kg)</label>
                  <input type="number" value={form.bagWeight} onChange={handleChange("bagWeight")} className="input-field text-xs" />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Cost Price (₨)</label>
                <input type="number" value={form.costPrice} onChange={handleChange("costPrice")} className="input-field text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Sale Price (₨)</label>
                <input type="number" value={form.salePrice} onChange={handleChange("salePrice")} className="input-field text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Minimum Stock Alert</label>
                <input type="number" value={form.minimumStock} onChange={handleChange("minimumStock")} className="input-field text-xs" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold text-slate-500">Description</label>
                <textarea value={form.description} onChange={handleChange("description")} className="input-field text-xs h-16 resize-none" />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={form.isActive} onChange={handleChange("isActive")} className="rounded border-slate-300" />
                  Active
                </label>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { DataTable } from "@/components/ui/DataTable";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/Button";
import { Package, Plus, Loader2, AlertTriangle, Boxes } from "lucide-react";
import { formatCurrency, formatQuantity } from "@/lib/formatters";
import { PageHeader, StatCard } from "@/components/layout/PageHeader";
import Link from "next/link";

export default function ProductsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showLowStock, setShowLowStock] = useState(false);

  const [form, setForm] = useState({
    name: "", categoryId: "", unit: "kg", bagWeight: "34",
    costPrice: "", salePrice: "", minimumStock: "", currentStock: "", description: "",
  });

  const fetchData = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch(`/api/products${showLowStock ? "?lowStock=true" : ""}`),
        fetch("/api/products/categories"),
      ]);
      const prodData = await prodRes.json();
      const catData = await catRes.json();
      if (prodRes.ok) setProducts(prodData.products || []);
      if (catRes.ok) setCategories(catData.categories || []);
    } catch {
      showToast("Error loading products", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [showLowStock]);

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.categoryId) {
      showToast("Product name and category are required", "warning");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Product "${form.name}" created!`, "success");
        setModalOpen(false);
        setForm({ name: "", categoryId: "", unit: "kg", bagWeight: "34", costPrice: "", salePrice: "", minimumStock: "", currentStock: "", description: "" });
        fetchData();
      } else showToast(data.error || "Failed to create product", "error");
    } catch {
      showToast("Error processing request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const lowStockCount = products.filter(p => p.currentStock <= p.minimumStock).length;

  const columns = [
    {
      header: "Product",
      accessor: "name",
      cell: (row) => (
        <div>
          <p className="font-semibold">{row.name}</p>
          <p className="text-[10px] font-mono text-slate-400">{row.sku}</p>
        </div>
      ),
    },
    {
      header: "Category",
      accessor: "category",
      cell: (row) => <Badge variant="info">{row.category?.name || "—"}</Badge>,
    },
    {
      header: "Stock",
      accessor: "currentStock",
      cell: (row) => {
        const isLow = row.currentStock <= row.minimumStock;
        return (
          <span className={`font-mono text-xs font-bold ${isLow ? "text-red-400" : "text-emerald-400"}`}>
            {formatQuantity(row.currentStock, row.unit)}
            {isLow && <AlertTriangle className="w-3 h-3 inline ml-1" />}
          </span>
        );
      },
    },
    {
      header: "Cost Price",
      accessor: "costPrice",
      cell: (row) => <span className="font-mono text-xs">{formatCurrency(row.costPrice)}</span>,
    },
    {
      header: "Sale Price",
      accessor: "salePrice",
      cell: (row) => <span className="font-mono text-xs">{formatCurrency(row.salePrice)}</span>,
    },
    {
      header: "Status",
      accessor: "isActive",
      cell: (row) => <Badge variant={row.isActive ? "success" : "neutral"}>{row.isActive ? "Active" : "Inactive"}</Badge>,
    },
  ];

  return (
    <div className="space-y-8 page-enter">
      <PageHeader
        module="products"
        title="Products & Inventory"
        description="Manage feed products, stock levels, and pricing."
        icon={Package}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/products/categories" className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 hover:text-slate-900 transition-colors">
              Categories
            </Link>
            <Button onClick={() => setModalOpen(true)} className="bg-acc-products hover:bg-violet-600 border-0 shadow-lg shadow-violet-900/20">
              <Plus className="w-4 h-4" /> Add Product
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard module="products" label="Total Products" value={products.length} icon={Boxes} />
        <StatCard module="products" label="Categories" value={categories.length} icon={Package} />
        <div onClick={() => setShowLowStock(!showLowStock)} className="cursor-pointer">
          <StatCard module="products" label="Low Stock Alerts" value={lowStockCount} icon={AlertTriangle} valueClassName="text-red-400" />
        </div>
      </div>

      <Card><CardContent>
        {loading ? (
          <div className="h-48 flex items-center justify-center"><Loader2 className="w-8 h-8 text-acc-products animate-spin" /></div>
        ) : (
          <DataTable columns={columns} data={products} searchKey="name" placeholder="Search products..." onRowClick={(row) => router.push(`/products/${row.id}`)} />
        )}
      </CardContent></Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add New Product" size="lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-semibold text-slate-500">Product Name *</label>
              <input type="text" value={form.name} onChange={handleChange("name")} required className="input-field text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Category *</label>
              <select value={form.categoryId} onChange={handleChange("categoryId")} required className="input-field text-xs">
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Unit</label>
              <select value={form.unit} onChange={handleChange("unit")} className="input-field text-xs">
                <option value="kg">Kilogram (Kg)</option>
                <option value="ton">Ton</option>
                <option value="bag">Bag (34kg)</option>
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
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Opening Stock</label>
              <input type="number" value={form.currentStock} onChange={handleChange("currentStock")} className="input-field text-xs" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 rounded-xl text-xs font-semibold cursor-pointer transition-colors">Cancel</button>
            <Button type="submit" disabled={submitting} className="bg-acc-products hover:bg-violet-600">
              {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving...</> : "Save Product"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

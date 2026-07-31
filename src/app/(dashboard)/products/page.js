"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { DataTable } from "@/components/ui/DataTable";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/Button";
import { 
  Package, 
  Plus, 
  Loader2, 
  AlertTriangle, 
  Boxes, 
  Tag, 
  Search, 
  ArrowLeft,
  ChevronRight,
  Filter
} from "lucide-react";
import { formatCurrency, formatQuantity } from "@/lib/formatters";
import { PageHeader } from "@/components/layout/PageHeader";
import Link from "next/link";

export default function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Category Filtering
  const [activeCategoryId, setActiveCategoryId] = useState(
    searchParams.get("category") ? parseInt(searchParams.get("category")) : null
  );

  const [form, setForm] = useState({
    name: "", categoryId: "", unit: "kg", bagWeight: "34",
    costPrice: "", salePrice: "", minimumStock: "", currentStock: "", description: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch(`/api/products?includeInactive=${showInactive}`),
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

  useEffect(() => { 
    fetchData(); 
  }, [showInactive]);

  useEffect(() => {
    const catId = searchParams.get("category");
    if (catId) setActiveCategoryId(parseInt(catId));
    else setActiveCategoryId(null);
  }, [searchParams]);

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const openAddModal = () => {
    setForm({ 
      name: "", 
      categoryId: activeCategoryId ? activeCategoryId.toString() : "", 
      unit: "kg", 
      bagWeight: "34", 
      costPrice: "", 
      salePrice: "", 
      minimumStock: "", 
      currentStock: "", 
      description: "" 
    });
    setModalOpen(true);
  };

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
        fetchData();
      } else showToast(data.error || "Failed to create product", "error");
    } catch {
      showToast("Error processing request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = (activeCategoryId === null || activeCategoryId === -1) ? true : p.categoryId === activeCategoryId;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategoryId, searchQuery]);

  const activeCategory = useMemo(() => {
    if (activeCategoryId === -1) return { name: "All Products" };
    return categories.find(c => c.id === activeCategoryId);
  }, [activeCategoryId, categories]);

  const columns = [
    {
      header: "Product",
      accessor: "name",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-50 text-acc-products flex items-center justify-center shrink-0 border border-violet-100">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-slate-900 leading-none mb-1">{row.name}</p>
            <p className="text-[10px] font-mono text-slate-400">{row.sku}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Category",
      accessor: "category",
      cell: (row) => (
        <Badge variant="info" className="bg-blue-50 text-blue-600 border-blue-100 px-2 py-0.5 font-bold uppercase tracking-wider text-[9px]">
          {row.category?.name || "—"}
        </Badge>
      ),
    },
    {
      header: "Inventory Status",
      accessor: "currentStock",
      cell: (row) => {
        const isLow = row.currentStock <= row.minimumStock;
        return (
          <div className="flex items-center gap-2">
            <span className={`font-mono text-xs font-bold ${isLow ? "text-red-500" : "text-emerald-500"}`}>
              {formatQuantity(row.currentStock, row.unit)}
            </span>
            {isLow && <AlertTriangle className="w-3 h-3 text-red-500" />}
          </div>
        );
      },
    },
    {
      header: "Pricing",
      accessor: "salePrice",
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-slate-900">{formatCurrency(row.salePrice)}</span>
      ),
    },
    {
      header: "Status",
      accessor: "isActive",
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${row.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          <span className="text-xs font-medium text-slate-600">
            {row.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      ),
    },
    {
      header: "",
      accessor: "actions",
      cell: (row) => <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-acc-products transition-colors" />
    }
  ];

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-acc-products animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 page-enter pb-10">
      <PageHeader
        module="products"
        title={activeCategoryId ? activeCategory?.name : "Products & Inventory"}
        description={activeCategoryId ? `Manage products in ${activeCategory?.name}` : "Browse and manage your inventory by category."}
        icon={activeCategoryId ? Tag : Package}
        breadcrumbs={activeCategoryId ? [{ label: "Products", href: "/products" }, { label: activeCategory?.name }] : []}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/products/categories" className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 hover:text-slate-900 transition-all flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-acc-products" /> Manage Categories
            </Link>
            <Button onClick={openAddModal} className="bg-acc-products hover:bg-violet-600 border-0 shadow-lg shadow-violet-900/20 px-5">
              <Plus className="w-4 h-4 mr-1" /> Add Product
            </Button>
          </div>
        }
      />

      {!activeCategoryId ? (
        /* CATEGORY SELECTION VIEW */
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {/* All Feed Card */}
          <div
            onClick={() => setActiveCategoryId(-1)} // Use -1 or some special value for "All"
            className="group cursor-pointer bg-white border border-slate-200 rounded-3xl p-6 hover:border-violet-400 hover:shadow-2xl hover:shadow-violet-900/10 transition-all duration-500"
          >
            <div className="w-14 h-14 rounded-2xl bg-violet-600 text-white flex items-center justify-center mb-6 shadow-lg shadow-violet-600/30 group-hover:scale-110 transition-transform">
              <Boxes className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-1">All Products</h3>
            <p className="text-sm text-slate-500 mb-6">View entire inventory across all categories.</p>
            <div className="flex items-center justify-between mt-auto">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{products.length} Items</span>
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-violet-50 group-hover:text-violet-600 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Individual Category Cards */}
          {categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => setActiveCategoryId(cat.id)}
              className="group cursor-pointer bg-white border border-slate-200 rounded-3xl p-6 hover:border-violet-400 hover:shadow-2xl hover:shadow-violet-900/10 transition-all duration-500"
            >
              <div className="w-14 h-14 rounded-2xl bg-violet-50 text-acc-products ring-1 ring-violet-100 flex items-center justify-center mb-6 group-hover:bg-violet-600 group-hover:text-white group-hover:ring-violet-600 shadow-lg group-hover:shadow-violet-600/30 transition-all duration-500">
                <Tag className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-1 truncate">{cat.name}</h3>
              <p className="text-sm text-slate-500 mb-6">Manage specific items for this category.</p>
              <div className="flex items-center justify-between mt-auto">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{cat._count?.products || 0} Items</span>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-violet-50 group-hover:text-violet-600 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* PRODUCT LIST VIEW FOR SELECTED CATEGORY */
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <button
              onClick={() => setActiveCategoryId(null)}
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-acc-products transition-colors group"
            >
              <div className="p-2 rounded-xl bg-slate-100 group-hover:bg-violet-50 transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </div>
              Back to Categories
            </button>
            
            <div className="relative w-full md:w-80 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products in this category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 shadow-sm transition-all"
                />
              </div>
              <button
                onClick={() => setShowInactive(!showInactive)}
                className={`p-2.5 rounded-2xl border transition-all flex items-center gap-2 ${
                  showInactive 
                    ? "bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-900/20" 
                    : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
                title={showInactive ? "Showing Inactive" : "Show Inactive"}
              >
                <Filter className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase hidden lg:inline">Inactive</span>
              </button>
            </div>
          </div>

          <Card className="overflow-hidden border-slate-200 shadow-xl shadow-slate-900/5">
            <CardContent className="p-0">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-24 px-6">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                    <Package className="w-10 h-10" />
                  </div>
                  <h4 className="text-xl font-bold text-slate-800">No products found</h4>
                  <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
                    {searchQuery 
                      ? "We couldn't find anything matching your search." 
                      : "There are no products listed in this category yet."}
                  </p>
                  <Button onClick={openAddModal} className="mt-8 bg-acc-products hover:bg-violet-600 border-0 shadow-lg shadow-violet-900/20">
                    <Plus className="w-4 h-4 mr-2" /> Add First Product
                  </Button>
                </div>
              ) : (
                <DataTable 
                  columns={columns} 
                  data={filteredProducts} 
                  onRowClick={(row) => router.push(`/products/${row.id}`)} 
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ADD PRODUCT MODAL */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add New Product"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <Button
              type="submit"
              form="add-product-form"
              disabled={submitting}
              className="bg-acc-products hover:bg-violet-600 border-0 px-5 py-2 text-sm shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  Saving…
                </>
              ) : (
                "Save Product"
              )}
            </Button>
          </div>
        }
      >
        <form id="add-product-form" onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-slate-500 -mt-1 mb-1">
            Product is added to the selected category. Stock and pricing can be updated later.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Product name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={handleChange("name")}
                required
                placeholder="e.g. Star Feed Poultry Mix"
                className="input-field w-full text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Category *
              </label>
              <select
                value={form.categoryId}
                onChange={handleChange("categoryId")}
                required
                className="input-field w-full text-sm"
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Unit
              </label>
              <select
                value={form.unit}
                onChange={handleChange("unit")}
                className="input-field w-full text-sm"
              >
                <option value="kg">Kilogram (Kg)</option>
                <option value="ton">Ton</option>
                <option value="bag">Bag (34kg)</option>
                <option value="piece">Piece</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Cost price (₨)
              </label>
              <input
                type="number"
                step="any"
                value={form.costPrice}
                onChange={handleChange("costPrice")}
                placeholder="0"
                className="input-field w-full text-sm tabular-nums"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Sale price (₨)
              </label>
              <input
                type="number"
                step="any"
                value={form.salePrice}
                onChange={handleChange("salePrice")}
                placeholder="0"
                className="input-field w-full text-sm tabular-nums"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Min. stock alert
              </label>
              <input
                type="number"
                step="any"
                value={form.minimumStock}
                onChange={handleChange("minimumStock")}
                placeholder="0"
                className="input-field w-full text-sm tabular-nums"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Opening stock
              </label>
              <input
                type="number"
                step="any"
                value={form.currentStock}
                onChange={handleChange("currentStock")}
                placeholder="0"
                className="input-field w-full text-sm tabular-nums"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

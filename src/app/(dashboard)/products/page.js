"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/Button";
import ProductsRegister from "@/components/products/ProductsRegister";
import ProductForm from "@/components/products/ProductForm";
import RegisterPrintView from "@/components/reports/RegisterPrintView";
import RegisterExportToolbar from "@/components/reports/RegisterExportToolbar";
import { useRegisterExport } from "@/hooks/useRegisterExport";
import {
  Package, Plus, Loader2, Tag, Search, ArrowLeft, ChevronRight, Filter, Boxes,
} from "lucide-react";
import { formatCurrency, formatQuantity } from "@/lib/formatters";

const emptyForm = {
  name: "", categoryId: "", unit: "ea", bagWeight: "34",
  costPrice: "", salePrice: "", minimumStock: "", currentStock: "", description: "",
};

const CATALOG_PRINT_COLS = [
  { key: "name", label: "Product", get: (r) => r.name, pdfWidth: 40 },
  { key: "sku", label: "SKU", get: (r) => r.sku || "—", pdfWidth: 22 },
  { key: "category", label: "Category", get: (r) => r.category?.name || "—", pdfWidth: 28 },
  { key: "stock", label: "Stock", align: "right", pdfWidth: 22, get: (r) => formatQuantity(r.currentStock, r.unit) },
  { key: "cost", label: "Cost", align: "right", pdfWidth: 22, get: (r) => formatCurrency(r.costPrice) },
  { key: "sale", label: "Sale price", align: "right", pdfWidth: 24, get: (r) => formatCurrency(r.salePrice) },
  { key: "status", label: "Status", pdfWidth: 18, get: (r) => (r.isActive ? "Active" : "Inactive") },
];

function ProductsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const printRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [companySettings, setCompanySettings] = useState(null);
  const [activeCategoryId, setActiveCategoryId] = useState(
    searchParams.get("category") ? parseInt(searchParams.get("category"), 10) : null
  );
  const [form, setForm] = useState(emptyForm);

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
      showToast("Error loading items", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [showInactive]);
  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => { if (d.settings) setCompanySettings(d.settings); }).catch(() => {});
  }, []);

  useEffect(() => {
    const catId = searchParams.get("category");
    if (catId) setActiveCategoryId(parseInt(catId, 10));
    else setActiveCategoryId(null);
  }, [searchParams]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = activeCategoryId == null || activeCategoryId === -1 ? true : p.categoryId === activeCategoryId;
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategoryId, searchQuery]);

  const activeCategory = useMemo(() => {
    if (activeCategoryId === -1) return { name: "All products" };
    return categories.find((c) => c.id === activeCategoryId);
  }, [activeCategoryId, categories]);

  const listTotalValue = filteredProducts.reduce(
    (s, p) => s + (p.currentStock || 0) * (p.costPrice || 0),
    0
  );

  const { pdfLoading, onPrint, onExportPdf } = useRegisterExport({
    printRef,
    title: activeCategoryId ? `Items — ${activeCategory?.name}` : "Item catalog",
    subtitle: `${filteredProducts.length} items`,
    company: companySettings,
    columns: CATALOG_PRINT_COLS,
    rows: filteredProducts,
    footers: [{
      label: "Total stock value",
      value: formatCurrency(listTotalValue),
      valueColumn: "sale",
      labelColumn: "stock",
    }],
    filename: `products-${new Date().toISOString().slice(0, 10)}.pdf`,
  });

  const openAddModal = () => {
    setForm({
      ...emptyForm,
      categoryId: activeCategoryId && activeCategoryId > 0 ? String(activeCategoryId) : "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.categoryId) {
      showToast("Item name and category are required", "warning");
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
        showToast(`Item "${form.name}" created!`, "success");
        setModalOpen(false);
        fetchData();
      } else showToast(data.error || "Failed to create item", "error");
    } catch {
      showToast("Error processing request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && products.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center erp-products-surface">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="erp-products-surface page-enter pb-8">
      <div className="erp-products-page space-y-5">
        <header className="erp-prod-page-header">
          <div>
            <div className="erp-prod-page-badge">
              <Package className="w-3.5 h-3.5" />
              Inventory module
            </div>
            <h1 className="erp-prod-page-title">
              {activeCategoryId ? activeCategory?.name : "Items & inventory"}
            </h1>
            <p className="erp-prod-page-desc">
              {activeCategoryId
                ? `Browse and manage items in ${activeCategory?.name}.`
                : "Select a category or view all items in the register."}
            </p>
          </div>
          <div className="erp-fin-header-actions">
            <Link href="/reports/inventory">
              <Button variant="outline" className="border-slate-200 text-slate-600">Inventory report</Button>
            </Link>
            <Link href="/products/categories">
              <Button variant="outline" className="border-slate-200 text-slate-600">
                <Tag className="w-4 h-4" /> Categories
              </Button>
            </Link>
            {activeCategoryId && (
              <Button onClick={openAddModal} className="bg-acc-products border-0">
                <Plus className="w-4 h-4" /> Add item
              </Button>
            )}
          </div>
        </header>

        {!activeCategoryId ? (
          <div className="erp-prod-category-grid">
            <button type="button" onClick={() => setActiveCategoryId(-1)} className="erp-prod-category-card erp-prod-category-all">
              <div className="erp-prod-category-icon"><Boxes className="w-6 h-6" /></div>
              <h3>All items</h3>
              <p>Full catalog across every category</p>
              <span className="erp-prod-category-count">{products.length} items</span>
              <ChevronRight className="erp-prod-category-arrow w-4 h-4" />
            </button>
            {categories.map((cat) => (
              <button key={cat.id} type="button" onClick={() => setActiveCategoryId(cat.id)} className="erp-prod-category-card">
                <div className="erp-prod-category-icon"><Tag className="w-6 h-6" /></div>
                <h3>{cat.name}</h3>
                <p>Items in this category</p>
                <span className="erp-prod-category-count">{cat._count?.products || 0} items</span>
                <ChevronRight className="erp-prod-category-arrow w-4 h-4" />
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="erp-fin-toolbar">
              <button type="button" onClick={() => setActiveCategoryId(null)} className="erp-ac-back-link">
                <ArrowLeft className="w-3.5 h-3.5" /> Categories
              </button>
              <div className="erp-fin-search-wrap">
                <Search className="erp-fin-search-icon" />
                <input
                  type="text"
                  placeholder="Search name or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => setShowInactive(!showInactive)}
                className={`erp-prod-filter-btn${showInactive ? " is-on" : ""}`}
              >
                <Filter className="w-3.5 h-3.5" />
                Inactive
              </button>
            </div>

            <div className="erp-prod-register">
              <div className="erp-prod-register-head">
                <div>
                  <p className="erp-prod-register-title">{activeCategory?.name}</p>
                  <p className="erp-prod-register-meta">{filteredProducts.length} products</p>
                </div>
                <RegisterExportToolbar
                  onPrint={onPrint}
                  onExportPdf={onExportPdf}
                  pdfLoading={pdfLoading}
                  disabled={filteredProducts.length === 0}
                  resultCount={filteredProducts.length}
                />
              </div>

              {filteredProducts.length === 0 && !loading ? (
                <div className="erp-ac-empty py-16 text-center">
                  <Package className="w-10 h-10 text-violet-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-600">No items found</p>
                  <Button onClick={openAddModal} className="mt-4 bg-acc-products border-0">
                    <Plus className="w-4 h-4" /> Add item
                  </Button>
                </div>
              ) : (
                <ProductsRegister
                  rows={filteredProducts}
                  loading={loading}
                  mode="catalog"
                  onRowClick={(row) => router.push(`/products/${row.id}`)}
                  footerLabel={`${filteredProducts.length} items`}
                  footerValue={formatCurrency(listTotalValue)}
                />
              )}
            </div>
          </>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add item" size="lg">
        <ProductForm
          form={form}
          onChange={setForm}
          categories={categories}
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
          submitLabel="Create item"
        />
      </Modal>

      <div className="erp-register-print-host" aria-hidden>
        <RegisterPrintView
          ref={printRef}
          title={activeCategory?.name || "Items"}
          subtitle={`${filteredProducts.length} items`}
          company={companySettings}
          columns={CATALOG_PRINT_COLS}
          rows={filteredProducts}
          footers={[{
            label: "Total stock value",
            value: formatCurrency(listTotalValue),
            valueColumn: "sale",
            labelColumn: "stock",
          }]}
        />
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="min-h-[400px] flex items-center justify-center"><Loader2 className="w-8 h-8 text-violet-600 animate-spin" /></div>}>
      <ProductsPageContent />
    </Suspense>
  );
}

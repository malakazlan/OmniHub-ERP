"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/Button";
import { Modal } from "@/components/ui/Modal";
import RegisterPrintView from "@/components/reports/RegisterPrintView";
import RegisterExportToolbar from "@/components/reports/RegisterExportToolbar";
import { useRegisterExport } from "@/hooks/useRegisterExport";
import { Tag, Plus, Loader2, ArrowLeft, Edit2, Trash2, Search, Boxes, AlertTriangle } from "lucide-react";

const PRINT_COLS = [
  { key: "name", label: "Category", get: (r) => r.name, pdfWidth: 80 },
  { key: "count", label: "Products", align: "right", pdfWidth: 40, get: (r) => String(r._count?.products || 0) },
  { key: "id", label: "ID", align: "center", pdfWidth: 20, get: (r) => `#${r.id}` },
];

export default function CategoriesPage() {
  const { showToast } = useToast();
  const printRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [name, setName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [companySettings, setCompanySettings] = useState(null);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/products/categories");
      const data = await res.json();
      if (res.ok) setCategories(data.categories || []);
    } catch {
      showToast("Error loading categories", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetch("/api/settings").then((r) => r.json()).then((d) => { if (d.settings) setCompanySettings(d.settings); }).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, searchQuery]);

  const { pdfLoading, onPrint, onExportPdf } = useRegisterExport({
    printRef,
    title: "Product Categories",
    subtitle: `${filtered.length} categories`,
    company: companySettings,
    columns: PRINT_COLS,
    rows: filtered,
    filename: `product-categories-${new Date().toISOString().slice(0, 10)}.pdf`,
  });

  const openAddModal = () => { setSelectedCategory(null); setName(""); setModalOpen(true); };
  const openEditModal = (cat) => { setSelectedCategory(cat); setName(cat.name); setModalOpen(true); };
  const openDeleteModal = (cat) => { setSelectedCategory(cat); setDeleteModalOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const url = selectedCategory ? `/api/products/categories/${selectedCategory.id}` : "/api/products/categories";
      const res = await fetch(url, {
        method: selectedCategory ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Category "${name}" ${selectedCategory ? "updated" : "created"}!`, "success");
        setModalOpen(false);
        fetchCategories();
      } else showToast(data.error || "Failed to process category", "error");
    } catch {
      showToast("Error processing request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/categories/${selectedCategory.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast("Category deleted", "success");
        setDeleteModalOpen(false);
        fetchCategories();
      } else showToast(data.error || "Failed to delete category", "error");
    } catch {
      showToast("Error deleting category", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="erp-products-surface page-enter pb-8">
      <div className="erp-products-page space-y-5">
        <header className="erp-prod-page-header">
          <div>
            <div className="erp-prod-page-badge"><Tag className="w-3.5 h-3.5" /> Product categories</div>
            <h1 className="erp-prod-page-title">Category directory</h1>
            <p className="erp-prod-page-desc">Organize feed types and product groups for your inventory register.</p>
          </div>
          <div className="erp-fin-header-actions">
            <Link href="/products"><Button variant="outline" className="border-slate-200 text-slate-600"><ArrowLeft className="w-4 h-4" /> Products</Button></Link>
            <Button onClick={openAddModal} className="bg-acc-products border-0"><Plus className="w-4 h-4" /> Add category</Button>
          </div>
        </header>

        <div className="erp-fin-toolbar">
          <div className="erp-fin-search-wrap">
            <Search className="erp-fin-search-icon" />
            <input type="text" placeholder="Search categories..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <RegisterExportToolbar onPrint={onPrint} onExportPdf={onExportPdf} pdfLoading={pdfLoading} disabled={filtered.length === 0} resultCount={filtered.length} label="categories" />
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 text-violet-600 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="erp-ac-empty py-16 text-center">
            <Tag className="w-10 h-10 text-violet-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-600">{searchQuery ? "No matching categories" : "No categories yet"}</p>
            {!searchQuery && <Button onClick={openAddModal} className="mt-4 bg-acc-products border-0"><Plus className="w-4 h-4" /> Add category</Button>}
          </div>
        ) : (
          <div className="erp-prod-category-grid">
            {filtered.map((cat) => (
              <div key={cat.id} className="erp-prod-category-card erp-prod-category-card-static">
                <div className="erp-prod-category-card-top">
                  <div className="erp-prod-category-icon"><Tag className="w-6 h-6" /></div>
                  <div className="erp-prod-category-actions">
                    <button type="button" onClick={() => openEditModal(cat)} className="erp-fin-icon-btn" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => openDeleteModal(cat)} className="erp-fin-icon-btn erp-fin-icon-btn-danger" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <h3>{cat.name}</h3>
                <div className="erp-prod-category-meta">
                  <Boxes className="w-3.5 h-3.5" />
                  {cat._count?.products || 0} products
                </div>
                <Link href={`/products?category=${cat.id}`} className="erp-prod-category-link">View products →</Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedCategory ? "Edit category" : "Add category"} size="sm">
        <form onSubmit={handleSubmit} className="erp-finance-form">
          <div className="erp-finance-field">
            <label className="erp-finance-label">Category name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required autoFocus className="erp-finance-input" placeholder="e.g. Poultry feed" />
          </div>
          <div className="erp-finance-form-actions">
            <button type="button" onClick={() => setModalOpen(false)} className="erp-finance-btn-ghost">Cancel</button>
            <Button type="submit" disabled={submitting || !name.trim()} className="bg-acc-products border-0">
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : selectedCategory ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete category" size="sm">
        <div className="space-y-4 text-center">
          <p className="text-sm text-slate-600">Delete <strong>{selectedCategory?.name}</strong>?</p>
          {selectedCategory?._count?.products > 0 && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-left text-xs text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              This category has {selectedCategory._count.products} linked products and cannot be deleted.
            </div>
          )}
          <div className="erp-finance-form-actions justify-center">
            <button type="button" onClick={() => setDeleteModalOpen(false)} className="erp-finance-btn-ghost">Cancel</button>
            <Button onClick={handleDelete} disabled={submitting || selectedCategory?._count?.products > 0} className="bg-red-500 border-0">
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>

      <div className="erp-register-print-host" aria-hidden>
        <RegisterPrintView ref={printRef} title="Product Categories" company={companySettings} columns={PRINT_COLS} rows={filtered} />
      </div>
    </div>
  );
}

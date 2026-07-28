"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/context/ToastContext";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/Button";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tag, Plus, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CategoriesPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  useEffect(() => { fetchCategories(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/products/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Category "${name}" created!`, "success");
        setModalOpen(false);
        setName("");
        fetchCategories();
      } else showToast(data.error || "Failed to create category", "error");
    } catch {
      showToast("Error processing request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 page-enter">
      <PageHeader
        module="products"
        title="Product Categories"
        description="Organize feed products into categories."
        icon={Tag}
        breadcrumbs={[{ label: "Products", href: "/products" }, { label: "Categories" }]}
        actions={
          <Button onClick={() => setModalOpen(true)} className="bg-acc-products hover:bg-violet-600 border-0 shadow-lg shadow-violet-900/20">
            <Plus className="w-4 h-4" /> Add Category
          </Button>
        }
      />

      <Link href="/products" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-acc-products transition-colors -mt-4">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Products
      </Link>

      {loading ? (
        <div className="h-48 flex items-center justify-center"><Loader2 className="w-8 h-8 text-acc-products animate-spin" /></div>
      ) : categories.length === 0 ? (
        <Card><CardContent className="text-center py-14">
          <Tag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-500">No categories yet</p>
          <p className="text-xs text-slate-400 mt-1">Add your first product category to get started.</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(cat => (
            <Card key={cat.id} hover>
              <CardContent className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-slate-900">{cat.name}</p>
                  <p className="text-xs text-slate-400">{cat._count?.products || 0} products</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-violet-50 text-acc-products ring-1 ring-violet-100 flex items-center justify-center shrink-0">
                  <Tag className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Category">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Category Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Poultry Feed" required className="input-field text-xs" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 rounded-xl text-xs font-semibold cursor-pointer transition-colors">Cancel</button>
            <Button type="submit" disabled={submitting} className="bg-acc-products hover:bg-violet-600 border-0">
              {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving...</> : "Save Category"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

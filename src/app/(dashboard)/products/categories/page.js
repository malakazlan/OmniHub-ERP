"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/context/ToastContext";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/Button";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tag, Plus, Loader2, ArrowLeft, Edit2, Trash2, Search, Boxes, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function CategoriesPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [name, setName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
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

  useEffect(() => {
    fetchCategories();
  }, []);

  const openAddModal = () => {
    setSelectedCategory(null);
    setName("");
    setModalOpen(true);
  };

  const openEditModal = (cat) => {
    setSelectedCategory(cat);
    setName(cat.name);
    setModalOpen(true);
  };

  const openDeleteModal = (cat) => {
    setSelectedCategory(cat);
    setDeleteModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const url = selectedCategory
        ? `/api/products/categories/${selectedCategory.id}`
        : "/api/products/categories";
      const method = selectedCategory ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(
          `Category "${name}" ${selectedCategory ? "updated" : "created"}!`,
          "success"
        );
        setModalOpen(false);
        setName("");
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
      const res = await fetch(`/api/products/categories/${selectedCategory.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Category deleted successfully", "success");
        setDeleteModalOpen(false);
        fetchCategories();
      } else showToast(data.error || "Failed to delete category", "error");
    } catch {
      showToast("Error deleting category", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 page-enter pb-10">
      <PageHeader
        module="products"
        title="Product Categories"
        description="Organize your inventory by feed types and product groups."
        icon={Tag}
        breadcrumbs={[{ label: "Products", href: "/products" }, { label: "Categories" }]}
        actions={
          <Button
            onClick={openAddModal}
            className="bg-acc-products hover:bg-violet-600 border-0 shadow-lg shadow-violet-900/20"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Category
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-acc-products transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Products
        </Link>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-acc-products animate-spin" />
        </div>
      ) : filteredCategories.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200 shadow-none">
          <CardContent className="text-center py-20">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <Tag className="w-8 h-8" />
            </div>
            <p className="text-base font-semibold text-slate-600">
              {searchQuery ? "No matching categories found" : "No categories yet"}
            </p>
            <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">
              {searchQuery
                ? "Try a different search term or add a new category."
                : "Add your first product category to start organizing your inventory."}
            </p>
            {!searchQuery && (
              <Button onClick={openAddModal} className="mt-6 bg-acc-products hover:bg-violet-600 border-0">
                <Plus className="w-4 h-4 mr-1" /> Add First Category
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCategories.map((cat) => (
            <div
              key={cat.id}
              className="group relative bg-white border border-slate-200 rounded-2xl p-5 hover:border-violet-300 hover:shadow-xl hover:shadow-violet-900/5 transition-all duration-300 overflow-hidden"
            >
              {/* Abstract decorative background */}
              <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-violet-50 rounded-full group-hover:bg-violet-100 transition-colors duration-500 -z-0 opacity-50" />
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-violet-50 text-acc-products ring-1 ring-violet-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Tag className="w-6 h-6" />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(cat)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Category"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openDeleteModal(cat)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-acc-products transition-colors">
                    {cat.name}
                  </h3>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Boxes className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">
                      {cat._count?.products || 0} Products
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center">
                   <Link 
                     href={`/products?category=${cat.id}`}
                     className="text-[11px] font-bold uppercase tracking-wider text-acc-products hover:translate-x-1 transition-transform inline-flex items-center gap-1"
                   >
                     View Products
                   </Link>
                   <span className="text-[10px] text-slate-400 font-mono italic">
                     ID: #{cat.id}
                   </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedCategory ? "Edit Category" : "Add New Category"}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">
              Category Name
            </label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter category name..."
                required
                autoFocus
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:bg-white transition-all"
              />
            </div>
            <p className="text-[10px] text-slate-400 ml-1 italic">
              Use descriptive names like "Poultry Feed", "Cattle Feed", etc.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-5 py-2.5 text-slate-500 hover:text-slate-800 text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <Button
              type="submit"
              disabled={submitting || !name.trim()}
              className="bg-acc-products hover:bg-violet-600 border-0 px-6"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                  Saving...
                </>
              ) : selectedCategory ? (
                "Update Category"
              ) : (
                "Create Category"
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Category"
        size="sm"
      >
        <div className="space-y-4">
          <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <Trash2 className="w-7 h-7" />
          </div>
          <div className="text-center">
            <h4 className="text-base font-bold text-slate-900">Are you sure?</h4>
            <p className="text-xs text-slate-500 mt-2">
              You are about to delete category{" "}
              <span className="font-bold text-slate-700 italic">
                "{selectedCategory?.name}"
              </span>
              . This action cannot be undone.
            </p>
            {selectedCategory?._count?.products > 0 && (
              <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-left">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-red-600 leading-tight">
                  Warning: This category has {selectedCategory._count.products} products. 
                  MySQL rules prevent deletion while products are linked.
                </p>
              </div>
            )}
          </div>
          <div className="flex justify-center gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={() => setDeleteModalOpen(false)}
              className="px-5 py-2.5 text-slate-500 hover:text-slate-800 text-xs font-bold transition-colors"
            >
              No, Keep it
            </button>
            <Button
              onClick={handleDelete}
              disabled={submitting || selectedCategory?._count?.products > 0}
              className="bg-red-500 hover:bg-red-600 border-0 px-6"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Yes, Delete"
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

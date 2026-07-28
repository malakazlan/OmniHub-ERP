"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, StatCard } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Card, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/Button";
import { Tags, Plus, Loader2, ArrowLeft, Pencil, Trash2 } from "lucide-react";

export default function ExpenseCategoriesPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", code: "", description: "" });

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/expenses/categories");
      const data = await res.json();
      if (res.ok) setCategories(data.categories || []);
      else showToast(data.error || "Failed to load categories", "error");
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: "", code: "", description: "" });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({ name: row.name, code: row.code || "", description: row.description || "" });
    setModalOpen(true);
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete category "${row.name}"?`)) return;
    try {
      const res = await fetch(`/api/expenses/categories/${row.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast("Category deleted", "success");
        fetchCategories();
      } else showToast(data.error || "Failed to delete category", "error");
    } catch {
      showToast("Error processing request", "error");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast("Category name is required", "warning");
      return;
    }
    setSubmitting(true);
    try {
      const url = editingId ? `/api/expenses/categories/${editingId}` : "/api/expenses/categories";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(editingId ? "Category updated!" : "Category added!", "success");
        setModalOpen(false);
        fetchCategories();
      } else showToast(data.error || "Failed to save category", "error");
    } catch {
      showToast("Error processing request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: "Category",
      accessor: "name",
      cell: (row) => (
        <span className="font-semibold text-slate-900 flex items-center gap-2">
          <Tags className="w-3.5 h-3.5 text-acc-accounts" />
          {row.name}
        </span>
      ),
    },
    {
      header: "Code",
      accessor: "code",
      cell: (row) => <span className="text-xs font-mono text-slate-500">{row.code || "—"}</span>,
    },
    {
      header: "Description",
      accessor: "description",
      cell: (row) => <span className="text-xs text-slate-600">{row.description || "—"}</span>,
    },
    {
      header: "Expenses",
      accessor: "_count",
      cell: (row) => <span className="text-xs text-slate-600">{row._count?.expenses || 0}</span>,
    },
    {
      header: "",
      accessor: "id",
      sortable: false,
      cell: (row) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); openEdit(row); }}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-acc-accounts transition-colors cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {user?.role === "admin" && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleDelete(row); }}
              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8 page-enter">
      <PageHeader
        module="accounts"
        title="Expense Categories"
        description="Organize business expenses into categories."
        icon={Tags}
        breadcrumbs={[
          { label: "Accounting", href: "/accounts" },
          { label: "Expenses", href: "/accounts/expenses" },
          { label: "Categories" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/accounts/expenses">
              <Button variant="outline" className="border-slate-200 text-slate-600">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            </Link>
            <Button onClick={openCreate} className="bg-acc-accounts hover:bg-indigo-700 border-0">
              <Plus className="w-4 h-4" /> Add Category
            </Button>
          </div>
        }
      />

      <StatCard module="accounts" label="Total Categories" value={categories.length} icon={Tags} />

      <Card>
        <CardContent>
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-acc-accounts animate-spin" />
            </div>
          ) : (
            <DataTable columns={columns} data={categories} searchKey="name" placeholder="Search categories..." />
          )}
        </CardContent>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit Category" : "Add Category"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="input-field"
              placeholder="e.g. Office Supplies"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Code</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              className="input-field"
              placeholder="e.g. OFF"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input-field h-16 resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 border border-slate-200 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <Button type="submit" disabled={submitting} className="bg-acc-accounts hover:bg-indigo-700 border-0">
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : editingId ? "Save Changes" : "Add Category"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

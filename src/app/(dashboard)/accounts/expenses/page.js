"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { PageHeader, StatCard } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Card, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/Button";
import { Wallet2, Plus, Loader2, ArrowLeft, Tags, Trash2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { useDefaultCashAccountId, applyDefaultCashAccount } from "@/hooks/useDefaultCashAccount";

const emptyForm = {
  expenseDate: new Date().toISOString().slice(0, 10),
  expenseTitle: "",
  categoryId: "",
  cashAmount: "",
  bankAmount: "",
  cashAccountId: "",
  bankAccountId: "",
  description: "",
  notes: "",
};

export default function ExpensesPage() {
  const { showToast } = useToast();
  const defaultCashAccountId = useDefaultCashAccountId();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchExpenses = async () => {
    try {
      const res = await fetch("/api/expenses");
      const data = await res.json();
      if (res.ok) setExpenses(data.expenses || []);
      else showToast(data.error || "Failed to load expenses", "error");
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [cRes, aRes] = await Promise.all([
          fetch("/api/expenses/categories"),
          fetch("/api/accounts"),
        ]);
        const cData = await cRes.json();
        const aData = await aRes.json();
        if (cRes.ok) setCategories(cData.categories || []);
        if (aRes.ok) {
          setCashAccounts((aData.accounts || []).filter((a) => a.category === "cash"));
          setBankAccounts((aData.accounts || []).filter((a) => a.category === "bank"));
        }
      } catch {
        /* ignore */
      }
    };
    load();
    fetchExpenses();
  }, []);

  const openCreate = () => {
    setForm(applyDefaultCashAccount(emptyForm, defaultCashAccountId));
    setModalOpen(true);
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete expense "${row.expenseTitle}"?`)) return;
    try {
      const res = await fetch(`/api/expenses/${row.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast("Expense deleted", "success");
        fetchExpenses();
      } else showToast(data.error || "Failed to delete expense", "error");
    } catch {
      showToast("Error processing request", "error");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.expenseTitle || (!form.cashAmount && !form.bankAmount)) {
      showToast("Title and amount are required", "warning");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Expense ${data.expense?.expenseNumber || ""} recorded!`, "success");
        setModalOpen(false);
        fetchExpenses();
      } else showToast(data.error || "Failed to save expense", "error");
    } catch {
      showToast("Error processing request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const totalAmount = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const thisMonth = expenses.filter((e) => {
    const d = new Date(e.expenseDate);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, e) => s + e.amount, 0);

  const columns = [
    {
      header: "Expense #",
      accessor: "expenseNumber",
      cell: (row) => <span className="font-mono text-xs font-bold text-acc-accounts">{row.expenseNumber}</span>,
    },
    {
      header: "Title",
      accessor: "expenseTitle",
      cell: (row) => (
        <div>
          <p className="font-semibold text-slate-900 text-sm">{row.expenseTitle}</p>
          {row.category && <p className="text-[10px] text-slate-500">{row.category.name}</p>}
        </div>
      ),
    },
    {
      header: "Method",
      accessor: "paymentMethod",
      cell: (row) => <span className="text-xs capitalize text-slate-600">{row.paymentMethod}</span>,
    },
    {
      header: "Amount",
      accessor: "amount",
      cell: (row) => <span className="font-mono text-xs font-bold text-red-600">{formatCurrency(row.amount)}</span>,
    },
    {
      header: "Date",
      accessor: "expenseDate",
      cell: (row) => <span className="text-xs text-slate-500">{formatDate(row.expenseDate)}</span>,
    },
    {
      header: "",
      accessor: "id",
      cell: (row) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleDelete(row); }}
          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-8 page-enter">
      <PageHeader
        module="accounts"
        title="Expenses"
        description="Record and track day-to-day business expenses."
        icon={Wallet2}
        breadcrumbs={[
          { label: "Accounting", href: "/accounts" },
          { label: "Expenses" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/accounts">
              <Button variant="outline" className="border-slate-200 text-slate-600">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            </Link>
            <Link href="/accounts/expenses/categories">
              <Button variant="outline" className="border-slate-200 text-slate-600">
                <Tags className="w-4 h-4" /> Categories
              </Button>
            </Link>
            <Button onClick={openCreate} className="bg-acc-accounts hover:bg-indigo-700 border-0">
              <Plus className="w-4 h-4" /> Add Expense
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard module="accounts" label="Total Expenses" value={formatCurrency(totalAmount)} icon={Wallet2} valueClassName="text-red-500" />
        <StatCard module="accounts" label="This Month" value={formatCurrency(thisMonth)} icon={Wallet2} />
      </div>

      <Card>
        <CardContent>
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-acc-accounts animate-spin" />
            </div>
          ) : (
            <DataTable columns={columns} data={expenses} searchKey="expenseTitle" placeholder="Search expenses..." />
          )}
        </CardContent>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Expense" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Title *</label>
              <input
                type="text"
                value={form.expenseTitle}
                onChange={(e) => setForm({ ...form, expenseTitle: e.target.value })}
                required
                className="input-field"
                placeholder="e.g. Office rent for July"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Category</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="input-field"
              >
                <option value="">— Uncategorized —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Date</label>
              <input
                type="date"
                value={form.expenseDate}
                onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                className="input-field"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Cash Amount</label>
              <input
                type="number"
                min="0"
                step="any"
                value={form.cashAmount}
                onChange={(e) => setForm({ ...form, cashAmount: e.target.value })}
                className="input-field"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Cash Account</label>
              <select
                value={form.cashAccountId}
                onChange={(e) => setForm({ ...form, cashAccountId: e.target.value })}
                className="input-field"
              >
                <option value="">— None —</option>
                {cashAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Bank Amount</label>
              <input
                type="number"
                min="0"
                step="any"
                value={form.bankAmount}
                onChange={(e) => setForm({ ...form, bankAmount: e.target.value })}
                className="input-field"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Bank Account</label>
              <select
                value={form.bankAccountId}
                onChange={(e) => setForm({ ...form, bankAccountId: e.target.value })}
                className="input-field"
              >
                <option value="">— None —</option>
                {bankAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input-field"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="input-field h-16 resize-none"
              />
            </div>
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
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Save Expense
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/Button";
import ExpenseForm from "@/components/accounts/ExpenseForm";
import ExpensesRegister from "@/components/accounts/ExpensesRegister";
import RegisterPrintView from "@/components/reports/RegisterPrintView";
import RegisterExportToolbar from "@/components/reports/RegisterExportToolbar";
import { useRegisterExport } from "@/hooks/useRegisterExport";
import {
  Wallet2, Plus, Loader2, Tags, Search, ArrowLeft,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { useDefaultCashAccountId, applyDefaultCashAccount } from "@/hooks/useDefaultCashAccount";

const EXPENSE_PRINT_COLS = [
  { key: "no", label: "Expense #", get: (r) => r.expenseNumber, pdfWidth: 28 },
  { key: "title", label: "Title", get: (r) => r.expenseTitle, pdfWidth: 45 },
  { key: "cat", label: "Category", get: (r) => r.category?.name || "—", pdfWidth: 28 },
  { key: "pay", label: "Payment", get: (r) => r.paymentMethod, pdfWidth: 22 },
  { key: "amt", label: "Amount", align: "right", get: (r) => formatCurrency(r.amount), pdfWidth: 28, tone: "danger" },
  { key: "date", label: "Date", get: (r) => formatDate(r.expenseDate), pdfWidth: 24 },
];

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
  const printRef = useRef(null);
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [searchQuery, setSearchQuery] = useState("");
  const [companySettings, setCompanySettings] = useState(null);

  const fetchExpenses = useCallback(async () => {
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
  }, [showToast]);

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
    fetch("/api/settings").then((r) => r.json()).then((d) => { if (d.settings) setCompanySettings(d.settings); }).catch(() => {});
  }, [fetchExpenses]);

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

  const filteredExpenses = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return expenses;
    return expenses.filter(
      (e) =>
        e.expenseTitle?.toLowerCase().includes(q) ||
        e.expenseNumber?.toLowerCase().includes(q) ||
        e.category?.name?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q)
    );
  }, [expenses, searchQuery]);

  const totalAmount = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const thisMonth = expenses
    .filter((e) => {
      const d = new Date(e.expenseDate);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, e) => s + e.amount, 0);
  const filteredTotal = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);

  const { pdfLoading, onPrint, onExportPdf } = useRegisterExport({
    printRef,
    title: "Expense Register",
    subtitle: `${filteredExpenses.length} expenses`,
    company: companySettings,
    columns: EXPENSE_PRINT_COLS,
    rows: filteredExpenses,
    footers: [{
      label: "Total",
      value: formatCurrency(filteredTotal),
      valueColumn: "amt",
      labelColumn: "pay",
    }],
    filename: `expenses-${new Date().toISOString().slice(0, 10)}.pdf`,
  });

  if (loading && expenses.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center erp-finance-surface">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="erp-finance-surface page-enter pb-8">
      <div className="erp-finance-page space-y-5">
        <header className="erp-fin-page-header">
          <div>
            <div className="erp-fin-page-badge">
              <Wallet2 className="w-3.5 h-3.5" />
              Finance · Expenses
            </div>
            <h1 className="erp-fin-page-title">Expense register</h1>
            <p className="erp-fin-page-desc">
              Record day-to-day business expenses with cash, bank, or split payment settlement.
            </p>
          </div>
          <div className="erp-fin-header-actions">
            <Link href="/accounts">
              <Button variant="outline" className="border-slate-200 text-slate-600">
                <ArrowLeft className="w-4 h-4" /> Accounts
              </Button>
            </Link>
            <Link href="/accounts/expenses/categories">
              <Button variant="outline" className="border-slate-200 text-slate-600">
                <Tags className="w-4 h-4" /> Categories
              </Button>
            </Link>
            <Button onClick={openCreate} className="bg-acc-accounts border-0">
              <Plus className="w-4 h-4" /> Add expense
            </Button>
          </div>
        </header>

        <div className="erp-fin-stats">
          <div className="erp-fin-stat">
            <div className="erp-fin-stat-icon"><Wallet2 className="w-4 h-4" /></div>
            <div>
              <p className="erp-fin-stat-label">Total expenses</p>
              <p className="erp-fin-stat-value is-expense">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
          <div className="erp-fin-stat">
            <div className="erp-fin-stat-icon"><Wallet2 className="w-4 h-4" /></div>
            <div>
              <p className="erp-fin-stat-label">This month</p>
              <p className="erp-fin-stat-value is-expense">{formatCurrency(thisMonth)}</p>
            </div>
          </div>
          <div className="erp-fin-stat">
            <div className="erp-fin-stat-icon"><Tags className="w-4 h-4" /></div>
            <div>
              <p className="erp-fin-stat-label">Categories</p>
              <p className="erp-fin-stat-value">{categories.length}</p>
            </div>
          </div>
        </div>

        <div className="erp-fin-toolbar">
          <div className="erp-fin-search-wrap">
            <Search className="erp-fin-search-icon" />
            <input
              type="text"
              placeholder="Search title, number, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="erp-fin-register">
          <div className="erp-fin-register-head">
            <div>
              <p className="erp-fin-register-title">Expense list</p>
              <p className="erp-fin-register-meta">
                {filteredExpenses.length} record{filteredExpenses.length === 1 ? "" : "s"}
                {searchQuery ? ` · “${searchQuery}”` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="erp-ac-section-balance">
                <p className="erp-ac-section-balance-label">Filtered total</p>
                <p className="erp-ac-section-balance-value is-neg">{formatCurrency(filteredTotal)}</p>
              </div>
              <RegisterExportToolbar
                onPrint={onPrint}
                onExportPdf={onExportPdf}
                pdfLoading={pdfLoading}
                disabled={filteredExpenses.length === 0}
                resultCount={filteredExpenses.length}
              />
            </div>
          </div>

          <ExpensesRegister
            rows={filteredExpenses}
            loading={loading}
            onDelete={handleDelete}
            totalAmount={filteredTotal}
          />
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Record expense" size="lg">
        <ExpenseForm
          form={form}
          onChange={setForm}
          categories={categories}
          cashAccounts={cashAccounts}
          bankAccounts={bankAccounts}
          defaultCashAccountId={defaultCashAccountId}
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>

      <div className="erp-register-print-host" aria-hidden>
        <RegisterPrintView
          ref={printRef}
          title="Expense Register"
          company={companySettings}
          columns={EXPENSE_PRINT_COLS}
          rows={filteredExpenses}
          footers={[{
            label: "Total",
            value: formatCurrency(filteredTotal),
            valueColumn: "amt",
            labelColumn: "pay",
          }]}
        />
      </div>
    </div>
  );
}

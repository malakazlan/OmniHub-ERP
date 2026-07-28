"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { PageHeader, StatCard } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/Button";
import { Receipt, Plus, Loader2, ArrowLeft, ArrowRightLeft } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

const emptyForm = {
  paymentDate: new Date().toISOString().slice(0, 10),
  paymentMethod: "cash",
  amount: "",
  fromAccountId: "",
  toAccountId: "",
  description: "",
  chequeNumber: "",
  bankName: "",
  notes: "",
};

const METHOD_VARIANTS = {
  cash: "success",
  bank_transfer: "info",
  cheque: "warning",
  online: "purple",
};

export default function PaymentsPage() {
  const { showToast } = useToast();
  const [payments, setPayments] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchPayments = async () => {
    try {
      const res = await fetch("/api/payments");
      const data = await res.json();
      if (res.ok) setPayments(data.payments || []);
      else showToast(data.error || "Failed to load payments", "error");
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/accounts");
        const data = await res.json();
        if (res.ok) setAccounts(data.accounts || []);
      } catch {
        /* ignore */
      }
    };
    load();
    fetchPayments();
  }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || (!form.fromAccountId && !form.toAccountId) || !form.description) {
      showToast("Amount, at least one account, and description are required", "warning");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Payment ${data.payment?.paymentNumber || ""} recorded!`, "success");
        setModalOpen(false);
        fetchPayments();
      } else showToast(data.error || "Failed to save payment", "error");
    } catch {
      showToast("Error processing request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const totalAmount = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const cashTotal = payments.filter((p) => p.paymentMethod === "cash").reduce((s, p) => s + p.amount, 0);
  const bankTotal = payments.filter((p) => p.paymentMethod === "bank_transfer").reduce((s, p) => s + p.amount, 0);

  const columns = [
    {
      header: "Payment #",
      accessor: "paymentNumber",
      cell: (row) => <span className="font-mono text-xs font-bold text-acc-accounts">{row.paymentNumber}</span>,
    },
    {
      header: "Flow",
      accessor: "fromAccount",
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-700">{row.fromAccount?.name || "—"}</span>
          <ArrowRightLeft className="w-3 h-3 text-slate-400" />
          <span className="text-slate-700">{row.toAccount?.name || "—"}</span>
        </div>
      ),
    },
    {
      header: "Description",
      accessor: "description",
      cell: (row) => <span className="text-xs text-slate-600 truncate max-w-[220px] block">{row.description}</span>,
    },
    {
      header: "Method",
      accessor: "paymentMethod",
      cell: (row) => (
        <Badge variant={METHOD_VARIANTS[row.paymentMethod] || "neutral"}>{row.paymentMethod?.replace("_", " ")}</Badge>
      ),
    },
    {
      header: "Amount",
      accessor: "amount",
      cell: (row) => <span className="font-mono text-xs font-bold text-slate-900">{formatCurrency(row.amount)}</span>,
    },
    {
      header: "Date",
      accessor: "paymentDate",
      cell: (row) => <span className="text-xs text-slate-500">{formatDate(row.paymentDate)}</span>,
    },
  ];

  return (
    <div className="space-y-8 page-enter">
      <PageHeader
        module="accounts"
        title="Payments"
        description="Record cash and bank transfers between accounts."
        icon={Receipt}
        breadcrumbs={[
          { label: "Accounting", href: "/accounts" },
          { label: "Payments" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/accounts">
              <Button variant="outline" className="border-slate-200 text-slate-600">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            </Link>
            <Button onClick={openCreate} className="bg-acc-accounts hover:bg-indigo-700 border-0">
              <Plus className="w-4 h-4" /> Record Payment
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard module="accounts" label="Total Payments" value={formatCurrency(totalAmount)} icon={Receipt} />
        <StatCard module="accounts" label="Cash Payments" value={formatCurrency(cashTotal)} icon={Receipt} />
        <StatCard module="accounts" label="Bank Payments" value={formatCurrency(bankTotal)} icon={Receipt} />
      </div>

      <Card>
        <CardContent>
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-acc-accounts animate-spin" />
            </div>
          ) : (
            <DataTable columns={columns} data={payments} searchKey="description" placeholder="Search payments..." />
          )}
        </CardContent>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Record Payment" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-slate-500">
            Funds move <span className="font-semibold text-slate-900">from</span> the source account{" "}
            <span className="font-semibold text-slate-900">to</span> the destination account.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">From Account</label>
              <select
                value={form.fromAccountId}
                onChange={(e) => setForm({ ...form, fromAccountId: e.target.value })}
                className="input-field"
              >
                <option value="">— None —</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">To Account</label>
              <select
                value={form.toAccountId}
                onChange={(e) => setForm({ ...form, toAccountId: e.target.value })}
                className="input-field"
              >
                <option value="">— None —</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Amount *</label>
              <input
                type="number"
                min="0"
                step="any"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
                className="input-field"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Date</label>
              <input
                type="date"
                value={form.paymentDate}
                onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
                className="input-field"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Method</label>
              <select
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                className="input-field"
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="online">Online</option>
              </select>
            </div>
            {form.paymentMethod === "cheque" && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Cheque Number</label>
                <input
                  type="text"
                  value={form.chequeNumber}
                  onChange={(e) => setForm({ ...form, chequeNumber: e.target.value })}
                  className="input-field"
                />
              </div>
            )}
            {(form.paymentMethod === "cheque" || form.paymentMethod === "bank_transfer") && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Bank Name</label>
                <input
                  type="text"
                  value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                  className="input-field"
                />
              </div>
            )}
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Description *</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
                className="input-field"
                placeholder="e.g. Payment to farmer for outstanding balance"
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
              Record Payment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

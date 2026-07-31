"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { PageHeader, StatCard } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/Button";
import {
  BookOpen, Loader2, ArrowLeft, ArrowDownCircle, ArrowUpCircle,
  Hash, Wallet, ArrowUpRight, ArrowDownLeft, Plus, Search, FileText,
  Receipt, ShoppingCart, Filter, X,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { ledgerEntryHasDocument, resolveLedgerDocument } from "@/lib/ledgerDocument";
import { PurchaseReceiptPanel } from "@/components/documents/PurchaseReceiptPanel";
import { SaleInvoicePanel } from "@/components/documents/SaleInvoicePanel";

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

const CATEGORY_LABELS = {
  cash: "Cash",
  bank: "Bank",
  farmer: "Farmer",
  company: "Company",
  shop: "Shop",
  salary: "Employee",
  transport: "Transport",
};

function DocTag({ entry }) {
  const doc = resolveLedgerDocument(entry);
  if (!doc) return null;
  const cls =
    doc.type === "purchase"
      ? "erp-ledger-doc-tag erp-ledger-doc-purchase"
      : doc.type === "sale"
        ? "erp-ledger-doc-tag erp-ledger-doc-sale"
        : "erp-ledger-doc-tag erp-ledger-doc-payment";
  const Icon = doc.type === "purchase" ? ShoppingCart : doc.type === "sale" ? Receipt : FileText;
  return (
    <span className={`${cls} inline-flex items-center gap-1 mt-1`}>
      <Icon className="w-3 h-3" />
      {doc.label}
    </span>
  );
}

export default function GeneralLedgerPage() {
  const { showToast } = useToast();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [account, setAccount] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [modalMode, setModalMode] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const [docLoading, setDocLoading] = useState(false);
  const [purchaseDoc, setPurchaseDoc] = useState(null);
  const [saleDoc, setSaleDoc] = useState(null);
  const [companySettings, setCompanySettings] = useState(null);
  const [paymentDoc, setPaymentDoc] = useState(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  useEffect(() => {
    async function loadAccounts() {
      try {
        const res = await fetch("/api/accounts");
        const data = await res.json();
        if (res.ok) setAccounts(data.accounts || []);
      } catch {
        /* ignore */
      }
    }
    loadAccounts();
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => { if (d.settings) setCompanySettings(d.settings); })
      .catch(() => {});
  }, []);

  const fetchLedger = useCallback(async () => {
    setLoading(true);
    try {
      const url = selectedAccountId
        ? `/api/accounts/ledger?accountId=${selectedAccountId}`
        : "/api/accounts/ledger";
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setAccount(data.account || null);
        setEntries(data.entries || []);
      } else {
        showToast(data.error || "Failed to load ledger", "error");
      }
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId]);

  useEffect(() => { fetchLedger(); }, [fetchLedger]);

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase();
    return entries.filter(
      (e) =>
        e.description?.toLowerCase().includes(q) ||
        e.reference?.toLowerCase().includes(q) ||
        e.account?.name?.toLowerCase().includes(q)
    );
  }, [entries, searchQuery]);

  const totalDebit = filteredEntries.reduce((s, e) => s + (e.debit || 0), 0);
  const totalCredit = filteredEntries.reduce((s, e) => s + (e.credit || 0), 0);
  const selectedAccountName = account?.name || "";
  const netMovement = totalDebit - totalCredit;

  const openPay = () => {
    if (!selectedAccountId) {
      showToast("Select an account first", "warning");
      return;
    }
    setForm({ ...emptyForm, toAccountId: String(selectedAccountId), fromAccountId: "" });
    setModalMode("pay");
  };

  const openReceive = () => {
    if (!selectedAccountId) {
      showToast("Select an account first", "warning");
      return;
    }
    setForm({ ...emptyForm, fromAccountId: String(selectedAccountId), toAccountId: "" });
    setModalMode("receive");
  };

  const closeModal = () => {
    setModalMode(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || (!form.fromAccountId && !form.toAccountId) || !form.description) {
      showToast("Amount, the other account, and description are required", "warning");
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
        showToast(`Payment ${data.payment?.paymentNumber || ""} recorded`, "success");
        closeModal();
        fetchLedger();
      } else showToast(data.error || "Failed to save payment", "error");
    } catch {
      showToast("Error processing request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEntryClick = async (row) => {
    const doc = resolveLedgerDocument(row);
    if (!doc) {
      showToast("No linked document for this entry", "info");
      return;
    }

    setDocLoading(true);
    try {
      if (doc.type === "purchase") {
        const res = await fetch(`/api/purchases/${doc.id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load purchase");
        setPurchaseDoc(data.purchase);
        setReceiptOpen(true);
      } else if (doc.type === "sale") {
        const res = await fetch(`/api/sales/${doc.id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load sale");
        setSaleDoc(data.sale);
        setInvoiceOpen(true);
      } else if (doc.type === "payment") {
        const res = await fetch("/api/payments");
        const data = await res.json();
        const payment = (data.payments || []).find((p) => p.id === doc.id);
        if (!payment) throw new Error("Payment not found");
        setPaymentDoc(payment);
        setPaymentModalOpen(true);
      }
    } catch (err) {
      showToast(err.message || "Could not open document", "error");
    } finally {
      setDocLoading(false);
    }
  };

  const columns = [
    {
      header: "Date",
      accessor: "date",
      cell: (row) => (
        <div>
          <p className="text-xs font-semibold text-slate-800 tabular-nums">{formatDate(row.date)}</p>
        </div>
      ),
    },
    ...(selectedAccountId
      ? []
      : [{
          header: "Account",
          accessor: "account",
          cell: (row) => (
            <div>
              <p className="text-xs font-semibold text-slate-800">{row.account?.name || "—"}</p>
              {row.account?.code && (
                <p className="text-[10px] font-mono text-slate-400 mt-0.5">{row.account.code}</p>
              )}
            </div>
          ),
        }]),
    {
      header: "Particulars",
      accessor: "description",
      cell: (row) => (
        <div className="max-w-[280px]">
          <p className="font-medium text-slate-900 text-sm leading-snug">{row.description}</p>
          {row.reference && (
            <p className="text-[10px] font-mono text-slate-400 mt-0.5">{row.reference}</p>
          )}
          {ledgerEntryHasDocument(row) && <DocTag entry={row} />}
        </div>
      ),
    },
    {
      header: "Debit",
      accessor: "debit",
      cell: (row) =>
        row.debit > 0 ? (
          <span className="font-mono text-sm font-bold text-rose-600 tabular-nums">{formatCurrency(row.debit)}</span>
        ) : (
          <span className="text-slate-200 font-mono text-sm">—</span>
        ),
    },
    {
      header: "Credit",
      accessor: "credit",
      cell: (row) =>
        row.credit > 0 ? (
          <span className="font-mono text-sm font-bold text-emerald-700 tabular-nums">{formatCurrency(row.credit)}</span>
        ) : (
          <span className="text-slate-200 font-mono text-sm">—</span>
        ),
    },
    {
      header: "Balance",
      accessor: "balance",
      cell: (row) => (
        <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">{formatCurrency(row.balance)}</span>
      ),
    },
    {
      header: "",
      accessor: "id",
      sortable: false,
      cell: (row) =>
        ledgerEntryHasDocument(row) ? (
          <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wide">Open</span>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6 page-enter erp-ledger-page pb-8">
      <PageHeader
        module="accounts"
        title="General Ledger"
        description="Complete transaction register — filter by account, record payments, and open linked bills or invoices."
        icon={BookOpen}
        breadcrumbs={[
          { label: "All Accounts", href: "/accounts" },
          { label: "General Ledger" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/accounts">
              <Button variant="outline" className="border-slate-200 text-slate-600">
                <ArrowLeft className="w-4 h-4" /> Accounts
              </Button>
            </Link>
            <Link href="/accounts/payments">
              <Button variant="outline" className="border-sky-200 text-sky-700 hover:bg-sky-50">
                <Receipt className="w-4 h-4" /> Payments
              </Button>
            </Link>
          </div>
        }
      />

      {/* Toolbar */}
      <div className="erp-ledger-toolbar p-4 sm:p-5 space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-end gap-4">
          <div className="flex-1 min-w-[240px] space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-sky-700 flex items-center gap-1.5">
              <Filter className="w-3 h-3" /> Ledger account
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full input-field bg-white border-sky-100 focus:border-sky-400 focus:ring-sky-500/20"
            >
              <option value="">All accounts — full register</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}{a.code ? ` · ${a.code}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={openPay}
              disabled={!selectedAccountId}
              variant="outline"
              className="border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-40"
            >
              <ArrowUpRight className="w-4 h-4" /> Pay Out
            </Button>
            <Button
              type="button"
              onClick={openReceive}
              disabled={!selectedAccountId}
              variant="outline"
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
            >
              <ArrowDownLeft className="w-4 h-4" /> Receive In
            </Button>
            {selectedAccountId && (
              <button
                type="button"
                onClick={() => setSelectedAccountId("")}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
        </div>

        {selectedAccountId && account && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-sky-100">
            <span className="erp-ledger-account-chip">
              <Wallet className="w-3.5 h-3.5" />
              {CATEGORY_LABELS[account.category] || account.category}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900">{account.name}</p>
              {account.code && <p className="text-[11px] font-mono text-slate-400">{account.code}</p>}
            </div>
            <div className="ml-auto text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Running balance</p>
              <p className={`text-xl font-black font-mono tabular-nums ${account.balance >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                {formatCurrency(account.balance)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {selectedAccountId ? (
          <StatCard
            module="accounts"
            label="Account balance"
            value={formatCurrency(account?.balance ?? 0)}
            icon={Wallet}
            valueClassName={account?.balance >= 0 ? "text-emerald-700" : "text-rose-600"}
          />
        ) : (
          <StatCard module="accounts" label="Active accounts" value={accounts.length} icon={Wallet} />
        )}
        <StatCard module="accounts" label="Total debit" value={formatCurrency(totalDebit)} icon={ArrowDownCircle} valueClassName="text-rose-600" />
        <StatCard module="accounts" label="Total credit" value={formatCurrency(totalCredit)} icon={ArrowUpCircle} valueClassName="text-emerald-700" />
        <StatCard
          module="accounts"
          label="Net movement"
          value={formatCurrency(Math.abs(netMovement))}
          icon={Hash}
          subtext={netMovement >= 0 ? "Debit excess" : "Credit excess"}
        />
      </div>

      {/* Register */}
      <div className="erp-ledger-register">
        <div className="erp-ledger-register-head">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Transaction register</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {selectedAccountId ? `Entries for ${selectedAccountName}` : "All posted ledger entries"}
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search particulars..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap tabular-nums">
              {filteredEntries.length} entries
            </span>
          </div>
        </div>

        {loading ? (
          <div className="h-52 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-7 h-7 text-sky-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No ledger entries</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Purchases, sales, and payments posted to accounts will appear in this register.
            </p>
          </div>
        ) : (
          <>
            {docLoading && (
              <p className="text-xs text-sky-700 px-4 py-2 flex items-center gap-2 bg-sky-50 border-b border-sky-100">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Opening document…
              </p>
            )}
            <DataTable
              columns={columns}
              data={filteredEntries}
              onRowClick={handleEntryClick}
            />
          </>
        )}
      </div>

      {/* Pay / Receive modal */}
      <Modal
        isOpen={modalMode !== null}
        onClose={closeModal}
        title={modalMode === "pay" ? `Pay — ${selectedAccountName}` : `Receive — ${selectedAccountName}`}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className={`rounded-xl px-4 py-3 text-xs border ${modalMode === "pay" ? "bg-rose-50 border-rose-100 text-rose-900" : "bg-emerald-50 border-emerald-100 text-emerald-900"}`}>
            {modalMode === "pay" ? (
              <>Funds move <strong>from</strong> the account you select <strong>to {selectedAccountName}</strong>.</>
            ) : (
              <>Funds move <strong>from {selectedAccountName}</strong> <strong>to</strong> the account you select.</>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {modalMode === "pay" ? "Pay from" : "Receive into"}
              </label>
              <select
                value={modalMode === "pay" ? form.fromAccountId : form.toAccountId}
                onChange={(e) =>
                  setForm(
                    modalMode === "pay"
                      ? { ...form, fromAccountId: e.target.value }
                      : { ...form, toAccountId: e.target.value }
                  )
                }
                className="input-field w-full"
              >
                <option value="">Select account</option>
                {accounts
                  .filter((a) => String(a.id) !== String(selectedAccountId))
                  .map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {modalMode === "pay" ? "Paying to" : "Receiving from"}
              </label>
              <input type="text" disabled value={selectedAccountName} className="input-field w-full disabled:opacity-70 bg-slate-50" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Amount *</label>
              <input
                type="number"
                min="0"
                step="any"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
                className="input-field w-full font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Date</label>
              <input
                type="date"
                value={form.paymentDate}
                onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
                className="input-field w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Method</label>
              <select
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                className="input-field w-full"
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="cheque">Cheque</option>
                <option value="online">Online</option>
              </select>
            </div>
            {form.paymentMethod === "cheque" && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Cheque number</label>
                <input
                  type="text"
                  value={form.chequeNumber}
                  onChange={(e) => setForm({ ...form, chequeNumber: e.target.value })}
                  className="input-field w-full"
                />
              </div>
            )}
            {(form.paymentMethod === "cheque" || form.paymentMethod === "bank_transfer") && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Bank name</label>
                <input
                  type="text"
                  value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                  className="input-field w-full"
                />
              </div>
            )}
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Description *</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
                className="input-field w-full"
                placeholder={modalMode === "pay" ? "Payment to supplier" : "Collection from customer"}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="input-field w-full h-16 resize-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={closeModal} className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 cursor-pointer hover:bg-slate-50">
              Cancel
            </button>
            <Button
              type="submit"
              disabled={submitting}
              className={modalMode === "pay" ? "bg-rose-600 hover:bg-rose-700 border-0" : "bg-emerald-600 hover:bg-emerald-700 border-0"}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {modalMode === "pay" ? "Record payment" : "Record receipt"}
            </Button>
          </div>
        </form>
      </Modal>

      <PurchaseReceiptPanel
        purchase={purchaseDoc}
        company={companySettings}
        open={receiptOpen}
        onClose={() => { setReceiptOpen(false); setPurchaseDoc(null); }}
        title="Purchase bill"
      />

      <SaleInvoicePanel
        sale={saleDoc}
        company={companySettings}
        open={invoiceOpen}
        onClose={() => { setInvoiceOpen(false); setSaleDoc(null); }}
      />

      <Modal
        isOpen={paymentModalOpen}
        onClose={() => { setPaymentModalOpen(false); setPaymentDoc(null); }}
        title="Payment voucher"
        size="md"
      >
        {paymentDoc && (
          <div className="space-y-4 text-sm">
            <p className="font-mono font-bold text-lg text-slate-900">{paymentDoc.paymentNumber}</p>
            <div className="grid grid-cols-2 gap-3 text-xs rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div>
                <p className="text-slate-500 font-semibold uppercase tracking-wide text-[10px]">Date</p>
                <p className="font-semibold mt-0.5">{formatDate(paymentDoc.paymentDate)}</p>
              </div>
              <div>
                <p className="text-slate-500 font-semibold uppercase tracking-wide text-[10px]">Amount</p>
                <p className="font-mono font-bold text-sky-800 mt-0.5">{formatCurrency(paymentDoc.amount)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-slate-500 font-semibold uppercase tracking-wide text-[10px]">Description</p>
                <p className="mt-0.5">{paymentDoc.description}</p>
              </div>
              {paymentDoc.fromAccount && (
                <div>
                  <p className="text-slate-500 font-semibold uppercase tracking-wide text-[10px]">From</p>
                  <p className="mt-0.5">{paymentDoc.fromAccount.name}</p>
                </div>
              )}
              {paymentDoc.toAccount && (
                <div>
                  <p className="text-slate-500 font-semibold uppercase tracking-wide text-[10px]">To</p>
                  <p className="mt-0.5">{paymentDoc.toAccount.name}</p>
                </div>
              )}
            </div>
            <Link href="/accounts/payments">
              <Button variant="outline" className="w-full border-sky-200 text-sky-700">
                Open payments list
              </Button>
            </Link>
          </div>
        )}
      </Modal>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { PageHeader, StatCard } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/Button";
import {
  BookOpen, Loader2, ArrowLeft, ArrowDownCircle, ArrowUpCircle,
  Hash, Wallet, ArrowUpRight, ArrowDownLeft, Plus,
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

export default function GeneralLedgerPage() {
  const { showToast } = useToast();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [account, setAccount] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalMode, setModalMode] = useState(null); // "pay" | "receive" | null
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
      .then((d) => {
        if (d.settings) setCompanySettings(d.settings);
      })
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

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const totalDebit = entries.reduce((s, e) => s + (e.debit || 0), 0);
  const totalCredit = entries.reduce((s, e) => s + (e.credit || 0), 0);
  const selectedAccountName = account?.name || "";

  const openPay = () => {
    if (!selectedAccountId) {
      showToast("Select an account above first", "warning");
      return;
    }
    // Paying this account means money flows FROM a cash/bank source TO the
    // selected account (e.g. paying a farmer reduces what we owe them).
    setForm({ ...emptyForm, toAccountId: String(selectedAccountId), fromAccountId: "" });
    setModalMode("pay");
  };

  const openReceive = () => {
    if (!selectedAccountId) {
      showToast("Select an account above first", "warning");
      return;
    }
    // Receiving from this account means money flows FROM the selected
    // account TO a cash/bank destination (e.g. collecting from a shop).
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
        showToast(`Payment ${data.payment?.paymentNumber || ""} recorded!`, "success");
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
    { header: "Date", accessor: "date", cell: (row) => <span className="text-xs text-slate-500">{formatDate(row.date)}</span> },
    ...(selectedAccountId
      ? []
      : [{
          header: "Account",
          accessor: "account",
          cell: (row) => <span className="text-xs font-semibold text-slate-700">{row.account?.name || "—"}</span>,
        }]),
    {
      header: "Description",
      accessor: "description",
      cell: (row) => (
        <div>
          <p className="font-medium text-slate-800 text-sm">{row.description}</p>
          {row.reference && <p className="text-[10px] font-mono text-slate-400">{row.reference}</p>}
        </div>
      ),
    },
    {
      header: "Debit",
      accessor: "debit",
      cell: (row) => row.debit > 0 ? <span className="font-mono text-xs font-bold text-red-500">{formatCurrency(row.debit)}</span> : <span className="text-slate-300">—</span>,
    },
    {
      header: "Credit",
      accessor: "credit",
      cell: (row) => row.credit > 0 ? <span className="font-mono text-xs font-bold text-emerald-600">{formatCurrency(row.credit)}</span> : <span className="text-slate-300">—</span>,
    },
    {
      header: "Balance",
      accessor: "balance",
      cell: (row) => <span className="font-mono text-xs font-bold text-slate-900">{formatCurrency(row.balance)}</span>,
    },
    {
      header: "",
      accessor: "id",
      sortable: false,
      cell: (row) =>
        ledgerEntryHasDocument(row) ? (
          <span className="text-[10px] font-semibold text-teal-600">View</span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-8 page-enter">
      <PageHeader
        module="accounts"
        title="General Ledger"
        description="All transactions — click a row to open its bill, invoice, or payment."
        icon={BookOpen}
        breadcrumbs={[{ label: "Accounting", href: "/accounts" }, { label: "General Ledger" }]}
        actions={
          <Link href="/accounts">
            <Button variant="outline" className="border-slate-200 text-slate-600">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1 min-w-[220px]">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Account</label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="input-field"
            >
              <option value="">— All Accounts (every transaction) —</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}{a.code ? ` (${a.code})` : ""}</option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            onClick={openPay}
            disabled={!selectedAccountId}
            className="bg-red-500 hover:bg-red-600 border-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowUpRight className="w-4 h-4" /> Pay Payment
          </Button>
          <Button
            type="button"
            onClick={openReceive}
            disabled={!selectedAccountId}
            className="bg-emerald-600 hover:bg-emerald-700 border-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowDownLeft className="w-4 h-4" /> Receive Payment
          </Button>
          {selectedAccountId && (
            <button
              type="button"
              onClick={() => setSelectedAccountId("")}
              className="text-xs text-slate-500 hover:text-slate-800 underline"
            >
              Clear filter
            </button>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {selectedAccountId ? (
          <StatCard module="accounts" label={`${selectedAccountName || "Account"} Balance`} value={formatCurrency(account?.balance)} icon={Wallet} />
        ) : (
          <StatCard module="accounts" label="Accounts" value={accounts.length} icon={Wallet} />
        )}
        <StatCard module="accounts" label="Total Debit" value={formatCurrency(totalDebit)} icon={ArrowDownCircle} valueClassName="text-red-500" />
        <StatCard module="accounts" label="Total Credit" value={formatCurrency(totalCredit)} icon={ArrowUpCircle} valueClassName="text-emerald-600" />
        <StatCard module="accounts" label="Entries" value={entries.length} icon={Hash} />
      </div>

      <Card>
        <CardContent>
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-acc-accounts animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-14">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-500">No ledger entries yet</p>
              <p className="text-xs text-slate-400 mt-1">Transactions posted to the ledger will appear here.</p>
            </div>
          ) : (
            <>
              {docLoading && (
                <p className="text-xs text-teal-700 mb-2 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Opening document…
                </p>
              )}
              <DataTable
                columns={columns}
                data={entries}
                searchKey="description"
                placeholder="Search transactions..."
                onRowClick={handleEntryClick}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={modalMode !== null}
        onClose={closeModal}
        title={modalMode === "pay" ? `Pay ${selectedAccountName || "Account"}` : `Receive from ${selectedAccountName || "Account"}`}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-slate-500">
            {modalMode === "pay" ? (
              <>Funds move from the account you pick below <span className="font-semibold text-slate-900">to {selectedAccountName || "the selected account"}</span>.</>
            ) : (
              <>Funds move from <span className="font-semibold text-slate-900">{selectedAccountName || "the selected account"}</span> to the account you pick below.</>
            )}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {modalMode === "pay" ? "Pay From" : "Receive Into"}
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
                className="input-field"
              >
                <option value="">— Select —</option>
                {accounts
                  .filter((a) => String(a.id) !== String(selectedAccountId))
                  .map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {modalMode === "pay" ? "Paying To" : "Receiving From"}
              </label>
              <input type="text" disabled value={selectedAccountName} className="input-field disabled:opacity-70" />
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
                placeholder={modalMode === "pay" ? "e.g. Payment to farmer for outstanding balance" : "e.g. Collection from shop"}
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
              onClick={closeModal}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 border border-slate-200 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <Button
              type="submit"
              disabled={submitting}
              className={modalMode === "pay" ? "bg-red-500 hover:bg-red-600 border-0" : "bg-emerald-600 hover:bg-emerald-700 border-0"}
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {modalMode === "pay" ? "Record Payment" : "Record Receipt"}
            </Button>
          </div>
        </form>
      </Modal>

      <PurchaseReceiptPanel
        purchase={purchaseDoc}
        company={companySettings}
        open={receiptOpen}
        onClose={() => {
          setReceiptOpen(false);
          setPurchaseDoc(null);
        }}
        title="Purchase bill"
      />

      <SaleInvoicePanel
        sale={saleDoc}
        company={companySettings}
        open={invoiceOpen}
        onClose={() => {
          setInvoiceOpen(false);
          setSaleDoc(null);
        }}
      />

      <Modal
        isOpen={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setPaymentDoc(null);
        }}
        title="Payment voucher"
        size="md"
      >
        {paymentDoc && (
          <div className="space-y-3 text-sm">
            <p className="font-mono font-bold text-slate-900">{paymentDoc.paymentNumber}</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-slate-500">Date</p>
                <p className="font-semibold">{formatDate(paymentDoc.paymentDate)}</p>
              </div>
              <div>
                <p className="text-slate-500">Amount</p>
                <p className="font-mono font-bold text-teal-800">{formatCurrency(paymentDoc.amount)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-slate-500">Description</p>
                <p>{paymentDoc.description}</p>
              </div>
              {paymentDoc.fromAccount && (
                <div>
                  <p className="text-slate-500">From</p>
                  <p>{paymentDoc.fromAccount.name}</p>
                </div>
              )}
              {paymentDoc.toAccount && (
                <div>
                  <p className="text-slate-500">To</p>
                  <p>{paymentDoc.toAccount.name}</p>
                </div>
              )}
            </div>
            <Link href="/accounts/payments">
              <Button variant="outline" className="w-full border-slate-200 mt-2">
                Open payments list
              </Button>
            </Link>
          </div>
        )}
      </Modal>
    </div>
  );
}

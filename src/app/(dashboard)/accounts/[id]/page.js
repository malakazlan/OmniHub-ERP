"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import GeneralLedgerRegister from "@/components/accounts/GeneralLedgerRegister";
import { PurchaseReceiptPanel } from "@/components/documents/PurchaseReceiptPanel";
import { SaleInvoicePanel } from "@/components/documents/SaleInvoicePanel";
import { PaymentReceiptPanel } from "@/components/documents/PaymentReceiptPanel";
import { ledgerEntryOpensInvoice } from "@/lib/ledgerEnrichment";
import {
  BookOpen, Loader2, ArrowLeft, MapPin, Phone, Hash, Wallet,
  ArrowDownCircle, ArrowUpCircle, ExternalLink,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

const CATEGORY_LABELS = {
  cash: "Cash",
  bank: "Bank",
  farmer: "Farmer",
  company: "Company",
  shop: "Shop",
  salary: "Employee",
  transport: "Driver",
};

const TYPE_LABELS = {
  asset: "Asset",
  liability: "Liability",
  equity: "Equity",
  revenue: "Revenue",
  expense: "Expense",
};

export default function AccountLedgerPage() {
  const { id } = useParams();
  const { showToast } = useToast();
  const [account, setAccount] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companySettings, setCompanySettings] = useState(null);
  const [docLoading, setDocLoading] = useState(false);
  const [purchaseDoc, setPurchaseDoc] = useState(null);
  const [saleDoc, setSaleDoc] = useState(null);
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [paymentReceiptOpen, setPaymentReceiptOpen] = useState(false);

  const fetchLedger = useCallback(async () => {
    try {
      const res = await fetch(`/api/accounts/ledger?accountId=${id}`);
      const data = await res.json();
      if (res.ok) {
        setAccount(data.account);
        setEntries(data.entries || []);
      } else {
        showToast(data.error || "Failed to load ledger", "error");
      }
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    if (id) {
      setLoading(true);
      fetchLedger();
    }
  }, [id, fetchLedger]);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => { if (d.settings) setCompanySettings(d.settings); })
      .catch(() => {});
  }, []);

  const totals = useMemo(() => {
    const debit = entries.reduce((s, e) => s + (e.debit || 0), 0);
    const credit = entries.reduce((s, e) => s + (e.credit || 0), 0);
    return { debit, credit, net: account?.balance ?? debit - credit };
  }, [entries, account]);

  const openDocument = useCallback(async (entry) => {
    if (!ledgerEntryOpensInvoice(entry)) return;
    setDocLoading(true);
    try {
      if (entry.docType === "purchase" && entry.purchaseId) {
        const res = await fetch(`/api/purchases/${entry.purchaseId}`);
        const data = await res.json();
        if (res.ok && data.purchase) {
          setPurchaseDoc(data.purchase);
          setReceiptOpen(true);
        } else showToast(data.error || "Could not load purchase", "error");
      } else if (entry.docType === "sale" && entry.saleId) {
        const res = await fetch(`/api/sales/${entry.saleId}`);
        const data = await res.json();
        if (res.ok && data.sale) {
          setSaleDoc(data.sale);
          setInvoiceOpen(true);
        } else showToast(data.error || "Could not load sale", "error");
      } else if (entry.docType === "payment" && entry.paymentId) {
        const res = await fetch(`/api/payments/${entry.paymentId}`);
        const data = await res.json();
        if (res.ok && data.payment) {
          setPaymentReceipt(data.payment);
          setPaymentReceiptOpen(true);
        } else showToast(data.error || "Could not load receipt", "error");
      }
    } catch {
      showToast("Error loading document", "error");
    } finally {
      setDocLoading(false);
    }
  }, [showToast]);

  if (loading) {
    return (
      <div className="h-72 flex items-center justify-center erp-accounts-surface">
        <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="erp-accounts-surface space-y-4 page-enter pb-8">
        <Link href="/accounts" className="erp-ac-back-link">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to account register
        </Link>
        <div className="erp-accounts-register py-14 text-center">
          <p className="text-sm font-semibold text-slate-500">Account not found</p>
        </div>
      </div>
    );
  }

  const displayPhone = account.phone || "—";
  const displayCity = account.city || "—";

  return (
    <div className="erp-accounts-surface page-enter pb-8">
      <div className="erp-accounts-page space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/accounts" className="erp-ac-back-link">
            <ArrowLeft className="w-3.5 h-3.5" /> Account register
          </Link>
          <Link
            href={`/accounts/ledger?accountId=${account.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 hover:text-sky-900 bg-sky-50 border border-sky-100 rounded-lg px-3 py-1.5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open in general ledger
          </Link>
        </div>

        <div className="erp-ac-account-panel">
          <div className="erp-ac-account-panel-head">
            <div className="erp-ac-account-title-block">
              <h1 className="erp-ac-account-title">{account.name}</h1>
              <div className="erp-ac-account-sub">
                <span><Hash className="w-3.5 h-3.5" /> {account.code || "No code"}</span>
                <span>{TYPE_LABELS[account.type] || account.type}</span>
                <span>{CATEGORY_LABELS[account.category] || account.category}</span>
                <span><Phone className="w-3.5 h-3.5" /> {displayPhone}</span>
                <span><MapPin className="w-3.5 h-3.5" /> {displayCity}</span>
              </div>
            </div>
            <div className="erp-ac-account-balance-block">
              <p className="erp-ac-account-balance-label">Current balance</p>
              <p className={`erp-ac-account-balance-value ${account.balance >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                {formatCurrency(account.balance)}
              </p>
            </div>
          </div>

          <div className="erp-ac-account-kpis">
            <div className="erp-ac-kpi">
              <p className="erp-ac-kpi-label">Total debit</p>
              <p className="erp-ac-kpi-value is-debit">{formatCurrency(totals.debit)}</p>
            </div>
            <div className="erp-ac-kpi">
              <p className="erp-ac-kpi-label">Total credit</p>
              <p className="erp-ac-kpi-value is-credit">{formatCurrency(totals.credit)}</p>
            </div>
            <div className="erp-ac-kpi">
              <p className="erp-ac-kpi-label">Ledger entries</p>
              <p className="erp-ac-kpi-value">{entries.length}</p>
            </div>
            <div className="erp-ac-kpi">
              <p className="erp-ac-kpi-label">Net movement</p>
              <p className="erp-ac-kpi-value">{formatCurrency(Math.abs(totals.debit - totals.credit))}</p>
            </div>
          </div>
        </div>

        <div className="erp-ac-ledger-register">
          <div className="erp-accounts-register-head">
            <div>
              <p className="erp-accounts-register-title flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-sky-600" />
                Account ledger
              </p>
              <p className="erp-accounts-register-meta">
                Chronological register · oldest at top · click invoice rows to open documents
              </p>
            </div>
            {docLoading && (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading document…
              </span>
            )}
          </div>

          <GeneralLedgerRegister
            entries={entries}
            loading={loading}
            showAccountColumn={false}
            onOpenDocument={openDocument}
            totals={totals}
          />
        </div>
      </div>

      <PurchaseReceiptPanel
        open={receiptOpen}
        onClose={() => { setReceiptOpen(false); setPurchaseDoc(null); }}
        purchase={purchaseDoc}
        companySettings={companySettings}
      />
      <SaleInvoicePanel
        open={invoiceOpen}
        onClose={() => { setInvoiceOpen(false); setSaleDoc(null); }}
        sale={saleDoc}
        companySettings={companySettings}
      />
      <PaymentReceiptPanel
        open={paymentReceiptOpen}
        onClose={() => { setPaymentReceiptOpen(false); setPaymentReceipt(null); }}
        payment={paymentReceipt}
        companySettings={companySettings}
      />
    </div>
  );
}

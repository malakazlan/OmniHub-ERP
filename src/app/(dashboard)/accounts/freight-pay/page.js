"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/Button";
import { Badge } from "@/components/ui/Badge";
import PaymentSplitFields from "@/components/accounts/PaymentSplitFields";
import { useDefaultCashAccountId } from "@/hooks/useDefaultCashAccount";
import { formatCurrency, formatDate, parseNumber } from "@/lib/formatters";
import {
  planFifoFreightSettlement,
  totalFreightOutstanding,
} from "@/lib/purchaseFreightSettlement";
import { Truck, Loader2, BookOpen, ArrowLeft, Sprout, Building2 } from "lucide-react";

const VENDOR_CATEGORIES = new Set(["farmer", "company"]);

export default function FreightPayPage() {
  const { showToast } = useToast();
  const defaultCashAccountId = useDefaultCashAccountId();

  const [accounts, setAccounts] = useState([]);
  const [allAccounts, setAllAccounts] = useState([]);
  const [vendorAccountId, setVendorAccountId] = useState("");
  const [bills, setBills] = useState([]);
  const [accountMeta, setAccountMeta] = useState(null);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingBills, setLoadingBills] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [cashAmount, setCashAmount] = useState("");
  const [bankAmount, setBankAmount] = useState("");
  const [cashAccountId, setCashAccountId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((d) => {
        if (d.accounts) {
          setAllAccounts(d.accounts.filter((a) => a.isActive !== false));
          setAccounts(
            d.accounts.filter((a) => a.isActive !== false && VENDOR_CATEGORIES.has(a.category))
          );
        }
      })
      .catch(() => showToast("Failed to load accounts", "error"))
      .finally(() => setLoadingAccounts(false));
  }, [showToast]);

  useEffect(() => {
    if (defaultCashAccountId && !cashAccountId) {
      setCashAccountId(String(defaultCashAccountId));
    }
  }, [defaultCashAccountId, cashAccountId]);

  const cashAccounts = useMemo(
    () => allAccounts.filter((a) => a.category === "cash"),
    [allAccounts]
  );
  const bankAccounts = useMemo(
    () => allAccounts.filter((a) => a.category === "bank"),
    [allAccounts]
  );
  const vendorAccounts = useMemo(
    () => accounts.filter((a) => VENDOR_CATEGORIES.has(a.category)),
    [accounts]
  );

  const fetchBills = useCallback(async () => {
    if (!vendorAccountId) {
      setBills([]);
      setAccountMeta(null);
      return;
    }
    setLoadingBills(true);
    try {
      const res = await fetch(`/api/purchases/freight-outstanding?ledgerAccountId=${vendorAccountId}`);
      const data = await res.json();
      if (res.ok) {
        setBills(data.purchases || []);
        setAccountMeta(data.account || null);
      } else {
        showToast(data.error || "Failed to load bills", "error");
        setBills([]);
      }
    } catch {
      showToast("Error loading purchase bills", "error");
      setBills([]);
    } finally {
      setLoadingBills(false);
    }
  }, [vendorAccountId, showToast]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const totalFreightDue = useMemo(() => totalFreightOutstanding(bills), [bills]);

  const allocationPreview = useMemo(() => {
    const cash = parseNumber(cashAmount);
    const bank = parseNumber(bankAmount);
    if (cash + bank <= 0 || !bills.length) return null;
    return planFifoFreightSettlement(bills, cash, bank);
  }, [bills, cashAmount, bankAmount]);

  const onPaymentChange = (field, value) => {
    if (field === "cashAmount") setCashAmount(value);
    if (field === "bankAmount") setBankAmount(value);
    if (field === "cashAccountId") setCashAccountId(value);
    if (field === "bankAccountId") setBankAccountId(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cash = parseNumber(cashAmount);
    const bank = parseNumber(bankAmount);
    if (!vendorAccountId) {
      showToast("Select a farmer or company account", "warning");
      return;
    }
    if (cash + bank <= 0) {
      showToast("Enter a payment amount", "warning");
      return;
    }
    if (cash > 0 && !cashAccountId) {
      showToast("Select a cash account", "warning");
      return;
    }
    if (bank > 0 && !bankAccountId) {
      showToast("Select a bank account", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/purchases/pay-freight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorAccountId: parseInt(vendorAccountId, 10),
          paymentDate,
          cashAmount: cash,
          bankAmount: bank,
          cashAccountId: cash > 0 ? cashAccountId : undefined,
          bankAccountId: bank > 0 ? bankAccountId : undefined,
          notes,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(
          `Freight payment posted — ${data.allocations?.length || 0} bill(s) cleared`,
          "success"
        );
        setCashAmount("");
        setBankAmount("");
        setNotes("");
        fetchBills();
      } else {
        showToast(data.error || "Payment failed", "error");
      }
    } catch {
      showToast("Error posting freight payment", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="erp-accounts-surface page-enter pb-8">
      <div className="erp-accounts-page max-w-4xl mx-auto space-y-5">
        <header className="erp-ac-page-header">
          <div className="erp-ac-page-header-main">
            <Link href="/accounts" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-teal-700 mb-2">
              <ArrowLeft className="w-3.5 h-3.5" /> All Accounts
            </Link>
            <div className="erp-ac-page-badge">
              <Truck className="w-3.5 h-3.5" />
              Freight payment
            </div>
            <h1 className="erp-ac-page-title">Pay purchase freight</h1>
            <p className="erp-ac-page-desc">
              Select a farmer or company account, review purchase bills with transport charges (oldest first), post freight payment, and ledger entries tagged as Transport.
            </p>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                Supplier account (farmer or company)
              </label>
              {loadingAccounts ? (
                <div className="flex items-center gap-2 text-slate-400 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading accounts…
                </div>
              ) : (
                <select
                  value={vendorAccountId}
                  onChange={(e) => setVendorAccountId(e.target.value)}
                  className="input-field w-full text-sm"
                >
                  <option value="">Select account…</option>
                  {vendorAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                      {a.code ? ` · ${a.code}` : ""} · {a.category}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {accountMeta && (
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                {accountMeta.category === "farmer" ? (
                  <Sprout className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Building2 className="w-4 h-4 text-blue-600" />
                )}
                <span className="font-semibold text-slate-800">{accountMeta.name}</span>
                <span className="text-slate-400">·</span>
                <span>Balance {formatCurrency(accountMeta.balance)}</span>
                <span className="text-slate-400">·</span>
                <span className="font-semibold text-amber-700">Freight due {formatCurrency(totalFreightDue)}</span>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/60 via-white to-white p-4 sm:p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Purchase bills — freight due</h2>
                <p className="text-xs text-slate-500 mt-0.5">Oldest first — payment clears freight FIFO</p>
              </div>
              {bills.length > 0 && (
                <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-1 rounded-full">
                  {bills.length} bill{bills.length === 1 ? "" : "s"}
                </span>
              )}
            </div>

            {loadingBills ? (
              <div className="py-10 flex justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : !vendorAccountId ? (
              <p className="text-sm text-slate-500 text-center py-6 border border-dashed border-slate-200 rounded-lg">
                Select a supplier account to load bills.
              </p>
            ) : bills.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6 border border-dashed border-slate-200 rounded-lg bg-white/60">
                No purchase bills with outstanding freight for this account.
              </p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {bills.map((bill, index) => (
                  <div
                    key={bill.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-3"
                  >
                    <div className="flex items-center gap-2 shrink-0 w-8 text-xs font-bold text-slate-400">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-bold text-slate-900">{bill.purchaseNumber}</span>
                        <Badge variant={bill.paymentStatus === "paid" ? "success" : bill.paymentStatus === "partial" ? "info" : "warning"}>
                          {bill.paymentStatus}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {formatDate(bill.purchaseDate)} · Transport {formatCurrency(bill.transportCost)}
                        {bill.transportPaidAmount > 0 && ` · Paid ${formatCurrency(bill.transportPaidAmount)}`}
                      </p>
                    </div>
                    <div className="text-right sm:shrink-0">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Freight due</p>
                      <p className="font-mono font-bold text-amber-700 tabular-nums">{formatCurrency(bill.freightDue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                Payment date
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="input-field w-full max-w-xs text-sm"
              />
            </div>

            <PaymentSplitFields
              cashAmount={cashAmount}
              bankAmount={bankAmount}
              cashAccountId={cashAccountId}
              bankAccountId={bankAccountId}
              onChange={onPaymentChange}
              cashAccounts={cashAccounts}
              bankAccounts={bankAccounts}
              defaultCashAccountId={defaultCashAccountId ? String(defaultCashAccountId) : ""}
              disabled={submitting}
            />

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                Notes (optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input-field w-full text-sm"
                placeholder="e.g. Lahore trip freight"
              />
            </div>

            {allocationPreview && allocationPreview.allocations.length > 0 && (
              <div className="rounded-lg border border-teal-200 bg-teal-50/50 px-3 py-3 text-sm">
                <p className="font-semibold text-teal-900 mb-2 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" /> Allocation preview (oldest first)
                </p>
                <ul className="space-y-1 text-teal-800">
                  {allocationPreview.allocations.map((a) => (
                    <li key={a.purchaseId} className="text-xs sm:text-sm">
                      <span className="font-mono font-bold">{a.purchaseNumber}</span>
                      {" — "}
                      {formatCurrency(a.amount)}
                      {a.clearsFreightFully ? " (freight cleared)" : " (partial)"}
                    </li>
                  ))}
                </ul>
                {allocationPreview.unapplied > 0.01 && (
                  <p className="text-xs text-amber-700 mt-2">
                    Unapplied: {formatCurrency(allocationPreview.unapplied)} — reduce payment amount
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={submitting || !vendorAccountId || bills.length === 0}
                className="bg-acc-accounts border-0 min-w-[160px]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Posting…
                  </>
                ) : (
                  <>
                    <Truck className="w-4 h-4" /> Post freight payment
                  </>
                )}
              </Button>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}

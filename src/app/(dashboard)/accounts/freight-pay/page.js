"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/Button";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatDate, parseNumber } from "@/lib/formatters";
import {
  planFifoFreightSettlement,
  totalFreightOutstanding,
} from "@/lib/purchaseFreightSettlement";
import { Truck, Loader2, BookOpen, ArrowLeft, Sprout, Building2, MinusCircle } from "lucide-react";

// Vendor ledger accounts live under the "company" category (farmer accounts are legacy and hidden).
const VENDOR_CATEGORIES = new Set(["company"]);

export default function FreightPayPage() {
  const { showToast } = useToast();

  const [accounts, setAccounts] = useState([]);
  const [vendorAccountId, setVendorAccountId] = useState("");
  const [bills, setBills] = useState([]);
  const [accountMeta, setAccountMeta] = useState(null);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingBills, setLoadingBills] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((d) => {
        if (d.accounts) {
          setAccounts(
            d.accounts.filter((a) => a.isActive !== false && VENDOR_CATEGORIES.has(a.category))
          );
        }
      })
      .catch(() => showToast("Failed to load accounts", "error"))
      .finally(() => setLoadingAccounts(false));
  }, [showToast]);

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
  const deductAmount = parseNumber(amount);
  const canSubmit = Boolean(vendorAccountId) && deductAmount > 0 && !submitting;

  const allocationPreview = useMemo(() => {
    const deduct = parseNumber(amount);
    if (deduct <= 0) return null;
    if (!bills.length) {
      return { allocations: [], unapplied: deduct, standaloneOnly: true };
    }
    return { ...planFifoFreightSettlement(bills, deduct), standaloneOnly: false };
  }, [bills, amount]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const deduct = parseNumber(amount);
    if (!vendorAccountId) {
      showToast("Select a vendor account", "warning");
      return;
    }
    if (deduct <= 0) {
      showToast("Enter an amount to deduct", "warning");
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
          amount: deduct,
          notes,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const billCount = data.allocations?.length || 0;
        const standalone = data.standaloneAmount > 0.01;
        const msg = billCount > 0 && standalone
          ? `Freight deducted — ${billCount} bill(s) cleared, ${formatCurrency(data.standaloneAmount)} ledger entry`
          : billCount > 0
            ? `Freight deducted — ${billCount} bill(s) cleared`
            : "Freight deducted — ledger entry posted";
        showToast(msg, "success");
        setAmount("");
        setNotes("");
        fetchBills();
      } else {
        showToast(data.error || "Deduction failed", "error");
      }
    } catch {
      showToast("Error posting freight deduction", "error");
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
              <ArrowLeft className="w-3.5 h-3.5" /> Chart of Accounts
            </Link>
            <div className="erp-ac-page-badge">
              <Truck className="w-3.5 h-3.5" />
              Freight settlement
            </div>
            <h1 className="erp-ac-page-title">Freight settlement</h1>
            <p className="erp-ac-page-desc">
              Select a vendor account, review bills with delivery charges (oldest first), and settle freight against the vendor account — no cash or bank payment.
            </p>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                Vendor account
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
                      {a.code ? ` · ${a.code}` : ""} · {a.category === "company" ? "vendor" : a.category}
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
                <h2 className="text-sm font-bold text-slate-900">Vendor bills — freight due</h2>
                <p className="text-xs text-slate-500 mt-0.5">Oldest first — deduction clears freight FIFO</p>
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
                No purchase bills with outstanding freight — you can still post a standalone Transport ledger entry below.
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
                Deduction date
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="input-field w-full max-w-xs text-sm"
              />
            </div>

            <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/70 via-white to-white p-4 space-y-3">
              <div className="flex items-center gap-2">
                <MinusCircle className="w-4 h-4 text-violet-600" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-violet-700">
                    Deduct from account
                  </p>
                  <p className="text-xs text-slate-500">
                    Freight is withheld from the supplier balance — not paid from cash or bank.
                  </p>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                  Amount to deduct
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input-field w-full max-w-sm text-sm font-mono tabular-nums"
                  placeholder="0.00"
                  disabled={submitting}
                />
                {totalFreightDue > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmount(String(totalFreightDue))}
                    className="mt-1.5 text-xs font-semibold text-violet-700 hover:text-violet-900"
                  >
                    Deduct full freight due ({formatCurrency(totalFreightDue)})
                  </button>
                )}
              </div>
              {parseNumber(amount) > 0 && (
                <p className="text-sm font-semibold text-slate-700">
                  Total deduction {formatCurrency(parseNumber(amount))}
                </p>
              )}
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                Notes (optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input-field w-full text-sm"
                placeholder="e.g. Chicago delivery freight"
              />
            </div>

            {allocationPreview && (
              <div className="rounded-lg border border-teal-200 bg-teal-50/50 px-3 py-3 text-sm">
                <p className="font-semibold text-teal-900 mb-2 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" /> Deduction preview
                </p>
                {allocationPreview.standaloneOnly ? (
                  <p className="text-xs sm:text-sm text-teal-800">
                    Standalone ledger entry — {formatCurrency(deductAmount)} tagged Transport on this account.
                  </p>
                ) : (
                  <>
                    {allocationPreview.allocations.length > 0 && (
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
                    )}
                    {allocationPreview.unapplied > 0.01 && (
                      <p className="text-xs text-teal-800 mt-2">
                        Plus standalone ledger entry: {formatCurrency(allocationPreview.unapplied)}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={!canSubmit}
                className="bg-acc-accounts border-0 min-w-[160px]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Posting…
                  </>
                ) : (
                  <>
                    <Truck className="w-4 h-4" /> Deduct freight
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

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Loader2, Receipt } from "lucide-react";

const PAYMENT_VARIANTS = {
  unpaid: "warning",
  partial: "info",
  paid: "success",
};

export function UnpaidSaleInvoicesPanel({ accountId, refreshKey = 0, embedded = false }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchInvoices = useCallback(async () => {
    if (!accountId) {
      setInvoices([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/sales?ledgerAccountId=${accountId}&outstanding=true`
      );
      const data = await res.json();
      if (res.ok) setInvoices(data.sales || []);
      else setInvoices([]);
    } catch {
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices, refreshKey]);

  if (!accountId) return null;

  const totalDue = invoices.reduce(
    (sum, s) => sum + Math.max((s.totalAmount || 0) - (s.paidAmount || 0), 0),
    0
  );

  return (
    <div
      className={
        embedded
          ? "rounded-lg border border-emerald-200/90 bg-emerald-50/40 p-3"
          : "rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 via-white to-white p-4 sm:p-5 shadow-sm"
      }
    >
      <div className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 ${embedded ? "mb-2" : "mb-4"}`}>
        <div className="flex items-start gap-2">
          {!embedded && (
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
          )}
          <div>
            <h3 className={`font-bold text-slate-900 ${embedded ? "text-xs" : "text-sm"}`}>
              {embedded ? "Sales invoices (Receive In)" : "Outstanding sales invoices"}
            </h3>
            {!embedded && (
              <p className="text-xs text-slate-500 mt-0.5">
                Oldest first — cleared when you <strong>Receive In</strong>.
              </p>
            )}
          </div>
        </div>
        {invoices.length > 0 && (
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Due</p>
            <p className={`font-mono font-bold text-emerald-700 tabular-nums ${embedded ? "text-sm" : "text-lg"}`}>
              {formatCurrency(totalDue)}
            </p>
          </div>
        )}
      </div>

      {loading ? (
        <div className={`flex items-center justify-center text-slate-400 ${embedded ? "py-4" : "py-8"}`}>
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : invoices.length === 0 ? (
        <p className={`text-slate-500 text-center border border-dashed border-slate-200 rounded-lg bg-white/60 ${embedded ? "text-xs py-3" : "text-sm py-4"}`}>
          No outstanding sales invoices.
        </p>
      ) : (
        <div className={`space-y-1.5 overflow-y-auto ${embedded ? "max-h-40" : ""}`}>
          {invoices.map((inv) => {
            const balance = Math.max((inv.totalAmount || 0) - (inv.paidAmount || 0), 0);
            return (
              <div
                key={inv.id}
                className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border border-slate-200/90 bg-white px-3 py-3 sm:px-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-slate-900">
                      {inv.invoiceNumber}
                    </span>
                    <Badge variant={PAYMENT_VARIANTS[inv.paymentStatus] || "neutral"}>
                      {inv.paymentStatus}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatDate(inv.saleDate)} · Total {formatCurrency(inv.totalAmount)}
                    {inv.paidAmount > 0 && ` · Paid ${formatCurrency(inv.paidAmount)}`}
                  </p>
                </div>
                <span className="font-mono font-bold text-emerald-700 tabular-nums text-sm sm:shrink-0">
                  {formatCurrency(balance)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const CUSTOMER_ACCOUNT_CATEGORIES = new Set(["shop", "company"]);

export function isCustomerLedgerAccount(account) {
  return account && CUSTOMER_ACCOUNT_CATEGORIES.has(account.category);
}

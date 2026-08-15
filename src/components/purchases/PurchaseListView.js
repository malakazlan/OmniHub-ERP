"use client";

import React, { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  Plus,
  Search,
  Loader2,
  FileText,
  AlertCircle,
  Wallet,
  RotateCcw,
  Receipt,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/Button";
import { formatCurrency } from "@/lib/formatters";
import FilterSelect from "@/components/listHub/FilterSelect";
import PurchaseRegister from "@/components/purchases/PurchaseRegister";
import {
  PURCHASE_STATUS_FILTERS,
  PURCHASE_PAYMENT_FILTERS,
  PURCHASE_PERIOD_FILTERS,
  PURCHASE_VENDOR_FILTERS,
} from "@/components/purchases/purchaseListConstants";
import { matchesPeriodFilter } from "@/lib/listDateFilters";

function sortPurchasesNewestFirst(list) {
  return [...list].sort((a, b) => {
    const da = new Date(a.purchaseDate).getTime();
    const db = new Date(b.purchaseDate).getTime();
    if (db !== da) return db - da;
    return (b.id || 0) - (a.id || 0);
  });
}

function summarizePurchases(list) {
  let total = 0;
  let paid = 0;
  let due = 0;
  let drafts = 0;
  let confirmed = 0;

  for (const p of list) {
    total += p.totalAmount || 0;
    paid += p.paidAmount || 0;
    due += Math.max((p.totalAmount || 0) - (p.paidAmount || 0), 0);
    if (p.status === "draft") drafts += 1;
    if (p.status === "confirmed" || p.status === "received") confirmed += 1;
  }

  return { count: list.length, total, paid, due, drafts, confirmed };
}

export default function PurchaseListView({
  purchases,
  loading,
  onOpenBill,
  onPay,
  onRefresh,
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");

  const sorted = useMemo(() => sortPurchasesNewestFirst(purchases), [purchases]);
  const summary = useMemo(() => summarizePurchases(purchases), [purchases]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return sorted.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (paymentFilter !== "all" && p.paymentStatus !== paymentFilter) return false;
      if (vendorFilter === "farmer" && !p.farmerId) return false;
      if (vendorFilter === "company" && !p.companyId) return false;
      if (!matchesPeriodFilter(p.purchaseDate, periodFilter)) return false;

      if (q) {
        const hay = [p.purchaseNumber, p.vendorName, p.status, p.paymentStatus]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [sorted, search, statusFilter, paymentFilter, periodFilter, vendorFilter]);

  const filteredSummary = useMemo(() => summarizePurchases(filtered), [filtered]);

  const hasActiveFilters =
    statusFilter !== "all" ||
    paymentFilter !== "all" ||
    periodFilter !== "all" ||
    vendorFilter !== "all" ||
    Boolean(search.trim());

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setPeriodFilter("all");
    setVendorFilter("all");
  };

  const handleRowOpen = useCallback(
    (id) => {
      const row = purchases.find((p) => p.id === id);
      if (row?.status === "draft") {
        router.push(`/purchases/new?edit=${id}`);
        return;
      }
      onOpenBill?.(id);
    },
    [purchases, router, onOpenBill]
  );

  return (
    <div className="erp-purchases-hub page-enter pb-8">
      <div className="erp-purchases-hub-inner space-y-5">
        <header className="erp-purchases-hub-header">
          <div>
            <div className="erp-purchases-hub-badge">
              <ShoppingCart className="w-3.5 h-3.5" />
              Purchases desk
            </div>
            <h1 className="erp-purchases-hub-title">Purchases</h1>
            <p className="erp-purchases-hub-desc">
              Spreadsheet-style supplier bills — filter, pay balances, and print invoices.
            </p>
          </div>
          <div className="erp-purchases-hub-actions">
            <Link href="/reports/purchases">
              <Button variant="outline" className="border-slate-200 text-slate-600">
                <FileText className="w-4 h-4" /> Purchase report
              </Button>
            </Link>
            <Link href="/purchases/new">
              <Button className="bg-acc-purchases hover:bg-blue-700 border-0 shadow-md shadow-blue-600/15">
                <Plus className="w-4 h-4" /> New purchase
              </Button>
            </Link>
          </div>
        </header>

        <div className="erp-purchases-stats">
          <div className="erp-purchases-stat">
            <div className="erp-purchases-stat-icon"><Receipt className="w-4 h-4" /></div>
            <div>
              <p className="erp-purchases-stat-label">Total orders</p>
              <p className="erp-purchases-stat-value">{summary.count}</p>
            </div>
          </div>
          <div className="erp-purchases-stat">
            <div className="erp-purchases-stat-icon"><FileText className="w-4 h-4" /></div>
            <div>
              <p className="erp-purchases-stat-label">Drafts</p>
              <p className="erp-purchases-stat-value">{summary.drafts}</p>
            </div>
          </div>
          <div className="erp-purchases-stat">
            <div className="erp-purchases-stat-icon"><TrendingUp className="w-4 h-4" /></div>
            <div>
              <p className="erp-purchases-stat-label">Confirmed</p>
              <p className="erp-purchases-stat-value">{summary.confirmed}</p>
            </div>
          </div>
          <div className="erp-purchases-stat">
            <div className="erp-purchases-stat-icon"><Wallet className="w-4 h-4" /></div>
            <div>
              <p className="erp-purchases-stat-label">Paid</p>
              <p className="erp-purchases-stat-value is-positive">{formatCurrency(summary.paid)}</p>
            </div>
          </div>
          <div className="erp-purchases-stat erp-purchases-stat-alert">
            <div className="erp-purchases-stat-icon"><AlertCircle className="w-4 h-4" /></div>
            <div>
              <p className="erp-purchases-stat-label">Outstanding</p>
              <p className="erp-purchases-stat-value is-warning">{formatCurrency(summary.due)}</p>
            </div>
          </div>
        </div>

        <div className="erp-purchases-filters-panel">
          <div className="erp-purchases-search-wrap">
            <Search className="erp-purchases-search-icon" />
            <input
              type="text"
              placeholder="Search PO #, vendor…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="erp-purchases-select-row">
            <FilterSelect label="Period" value={periodFilter} onChange={setPeriodFilter} options={PURCHASE_PERIOD_FILTERS} classPrefix="erp-purchases" />
            <FilterSelect label="Order status" value={statusFilter} onChange={setStatusFilter} options={PURCHASE_STATUS_FILTERS} classPrefix="erp-purchases" />
            <FilterSelect label="Payment" value={paymentFilter} onChange={setPaymentFilter} options={PURCHASE_PAYMENT_FILTERS} classPrefix="erp-purchases" />
            <FilterSelect label="Vendor" value={vendorFilter} onChange={setVendorFilter} options={PURCHASE_VENDOR_FILTERS} classPrefix="erp-purchases" />
            {hasActiveFilters && (
              <button type="button" className="erp-purchases-clear-filters" onClick={clearFilters}>
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="erp-purchases-register erp-purchases-sheet-panel">
          <div className="erp-purchases-register-head">
            <div>
              <p className="erp-purchases-register-title">Purchase register</p>
              <p className="erp-purchases-register-meta">
                {filtered.length} of {purchases.length} rows · {formatCurrency(filteredSummary.total)} in view · newest first
              </p>
            </div>
            {onRefresh && (
              <button type="button" className="erp-purchases-refresh-btn" onClick={onRefresh}>
                Refresh
              </button>
            )}
          </div>

          {loading ? (
            <div className="h-52 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-acc-purchases animate-spin" />
            </div>
          ) : (
            <PurchaseRegister rows={filtered} onOpenBill={handleRowOpen} onPay={onPay} />
          )}
        </div>
      </div>
    </div>
  );
}

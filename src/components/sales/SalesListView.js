"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  DollarSign,
  Plus,
  Search,
  Loader2,
  Receipt,
  TrendingUp,
  AlertCircle,
  FileText,
  Wallet,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/Button";
import { formatCurrency } from "@/lib/formatters";
import { saleCustomerTypeLabel } from "@/lib/saleCustomer";
import SalesRegister from "@/components/sales/SalesRegister";
import {
  SALES_STATUS_FILTERS,
  SALES_PAYMENT_FILTERS,
  SALES_PERIOD_FILTERS,
  SALES_CUSTOMER_FILTERS,
} from "@/components/sales/salesListConstants";

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d) {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? 6 : day - 1;
  x.setDate(x.getDate() - diff);
  return x;
}

function startOfMonth(d) {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

function customerTypeKey(sale) {
  if (sale.farmerId) return "farmer";
  if (sale.shopId) return "shop";
  if (sale.companyId) return "company";
  return "walkin";
}

function sortSalesNewestFirst(list) {
  return [...list].sort((a, b) => {
    const da = new Date(a.saleDate).getTime();
    const db = new Date(b.saleDate).getTime();
    if (db !== da) return db - da;
    return (b.id || 0) - (a.id || 0);
  });
}

function summarizeSales(list) {
  let revenue = 0;
  let collected = 0;
  let outstanding = 0;
  let active = 0;
  let unpaid = 0;

  for (const s of list) {
    revenue += s.totalAmount || 0;
    collected += s.paidAmount || 0;
    outstanding += Math.max((s.totalAmount || 0) - (s.paidAmount || 0), 0);
    if (["confirmed", "dispatched", "delivered"].includes(s.status)) active += 1;
    if (s.paymentStatus === "unpaid" || s.paymentStatus === "partial") unpaid += 1;
  }

  return { total: list.length, revenue, collected, outstanding, active, unpaid };
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="erp-sales-select-field">
      <span className="erp-sales-select-label">{label}</span>
      <select
        className="erp-sales-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map(({ key, label: optLabel }) => (
          <option key={key} value={key}>
            {optLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function SalesListView({ sales, loading, onOpenInvoice }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");

  const sorted = useMemo(() => sortSalesNewestFirst(sales), [sales]);
  const summary = useMemo(() => summarizeSales(sales), [sales]);

  const filtered = useMemo(() => {
    const now = new Date();
    const q = search.toLowerCase().trim();

    return sorted.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (paymentFilter !== "all" && s.paymentStatus !== paymentFilter) return false;
      if (customerFilter !== "all" && customerTypeKey(s) !== customerFilter) return false;

      if (periodFilter !== "all") {
        const saleDay = startOfDay(new Date(s.saleDate));
        if (periodFilter === "today" && saleDay.getTime() !== startOfDay(now).getTime()) return false;
        if (periodFilter === "week" && saleDay < startOfWeek(now)) return false;
        if (periodFilter === "month" && saleDay < startOfMonth(now)) return false;
      }

      if (q) {
        const hay = [
          s.invoiceNumber,
          s.customerName,
          saleCustomerTypeLabel(s),
          s.status,
          s.paymentStatus,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [sorted, search, statusFilter, paymentFilter, periodFilter, customerFilter]);

  const filteredSummary = useMemo(() => summarizeSales(filtered), [filtered]);

  const hasActiveFilters =
    statusFilter !== "all" ||
    paymentFilter !== "all" ||
    periodFilter !== "all" ||
    customerFilter !== "all" ||
    Boolean(search.trim());

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setPeriodFilter("all");
    setCustomerFilter("all");
  };

  return (
    <div className="erp-sales-hub page-enter pb-8">
      <div className="erp-sales-hub-inner space-y-5">
        <header className="erp-sales-hub-header">
          <div>
            <div className="erp-sales-hub-badge">
              <DollarSign className="w-3.5 h-3.5" />
              Sales desk
            </div>
            <h1 className="erp-sales-hub-title">Sales & invoices</h1>
            <p className="erp-sales-hub-desc">
              Spreadsheet-style register with dropdown filters — newest invoices at the top.
            </p>
          </div>
          <div className="erp-sales-hub-actions">
            <Link href="/reports/sales">
              <Button variant="outline" className="border-slate-200 text-slate-600">
                <FileText className="w-4 h-4" /> Sales report
              </Button>
            </Link>
            <Link href="/sales/new">
              <Button className="bg-acc-sales hover:bg-green-700 border-0 shadow-md shadow-green-600/15">
                <Plus className="w-4 h-4" /> New sale
              </Button>
            </Link>
          </div>
        </header>

        <div className="erp-sales-stats">
          <div className="erp-sales-stat">
            <div className="erp-sales-stat-icon"><Receipt className="w-4 h-4" /></div>
            <div>
              <p className="erp-sales-stat-label">Total invoices</p>
              <p className="erp-sales-stat-value">{summary.total}</p>
            </div>
          </div>
          <div className="erp-sales-stat">
            <div className="erp-sales-stat-icon"><TrendingUp className="w-4 h-4" /></div>
            <div>
              <p className="erp-sales-stat-label">Active orders</p>
              <p className="erp-sales-stat-value">{summary.active}</p>
            </div>
          </div>
          <div className="erp-sales-stat">
            <div className="erp-sales-stat-icon"><DollarSign className="w-4 h-4" /></div>
            <div>
              <p className="erp-sales-stat-label">Total revenue</p>
              <p className="erp-sales-stat-value">{formatCurrency(summary.revenue)}</p>
            </div>
          </div>
          <div className="erp-sales-stat">
            <div className="erp-sales-stat-icon"><Wallet className="w-4 h-4" /></div>
            <div>
              <p className="erp-sales-stat-label">Collected</p>
              <p className="erp-sales-stat-value is-positive">{formatCurrency(summary.collected)}</p>
            </div>
          </div>
          <div className="erp-sales-stat erp-sales-stat-alert">
            <div className="erp-sales-stat-icon"><AlertCircle className="w-4 h-4" /></div>
            <div>
              <p className="erp-sales-stat-label">Outstanding</p>
              <p className="erp-sales-stat-value is-warning">{formatCurrency(summary.outstanding)}</p>
              <p className="erp-sales-stat-sub">{summary.unpaid} unpaid / partial</p>
            </div>
          </div>
        </div>

        <div className="erp-sales-filters-panel erp-sales-filters-compact">
          <div className="erp-sales-search-wrap">
            <Search className="erp-sales-search-icon" />
            <input
              type="text"
              placeholder="Search invoice #, customer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="erp-sales-select-row">
            <FilterSelect
              label="Period"
              value={periodFilter}
              onChange={setPeriodFilter}
              options={SALES_PERIOD_FILTERS}
            />
            <FilterSelect
              label="Order status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={SALES_STATUS_FILTERS}
            />
            <FilterSelect
              label="Payment"
              value={paymentFilter}
              onChange={setPaymentFilter}
              options={SALES_PAYMENT_FILTERS}
            />
            <FilterSelect
              label="Customer"
              value={customerFilter}
              onChange={setCustomerFilter}
              options={SALES_CUSTOMER_FILTERS}
            />
            {hasActiveFilters && (
              <button type="button" className="erp-sales-clear-filters" onClick={clearFilters}>
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="erp-sales-register erp-sales-sheet-panel">
          <div className="erp-sales-register-head">
            <div>
              <p className="erp-sales-register-title">Sales register</p>
              <p className="erp-sales-register-meta">
                {filtered.length} of {sales.length} rows · {formatCurrency(filteredSummary.revenue)} in view · sorted newest first
              </p>
            </div>
          </div>

          {loading ? (
            <div className="h-52 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-acc-sales animate-spin" />
            </div>
          ) : (
            <SalesRegister rows={filtered} onOpenInvoice={onOpenInvoice} />
          )}
        </div>
      </div>
    </div>
  );
}

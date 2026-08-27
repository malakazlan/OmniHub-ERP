"use client";

import React, { useMemo } from "react";
import {
  Search,
  Filter,
  Calendar,
  X,
  Printer,
  FileDown,
  ArrowUpRight,
  ArrowDownLeft,
  User,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/Button";
import {
  LEDGER_CATEGORY_OPTIONS,
  LEDGER_ENTRY_TYPE_OPTIONS,
  filterAccountsForLedger,
} from "@/lib/ledgerExport";

export default function GeneralLedgerFilters({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  entryType,
  onEntryTypeChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  onClear,
  onPrint,
  onExportPdf,
  pdfLoading = false,
  resultCount = 0,
  totalCount = 0,
  hasActiveFilters = false,
  accounts = [],
  entries = [],
  selectedAccountId = "",
  onSelectAccount,
  onPayOut,
  onReceiveIn,
}) {
  const filterScopedAccounts = useMemo(
    () => filterAccountsForLedger(accounts, entries, { category, entryType, dateFrom, dateTo }),
    [accounts, entries, category, entryType, dateFrom, dateTo]
  );

  return (
    <div className="erp-ledger-filters no-print">
      <div className="erp-ledger-filters-row erp-ledger-filters-row-primary">
        <div className="erp-ledger-toolbar-row">
          <div className="erp-ledger-account-picker">
            <User className="erp-ledger-account-picker-icon" aria-hidden />
            <select
              value={selectedAccountId}
              onChange={(e) => onSelectAccount?.(e.target.value)}
              className="erp-ledger-account-picker-select"
              aria-label="Select ledger account"
            >
              <option value="">All accounts</option>
              {filterScopedAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {a.code ? ` · ${a.code}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="erp-ledger-search-wrap">
            <Search className="erp-ledger-search-icon" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search reference, name, phone…"
              className="erp-ledger-search-input"
              aria-label="Search ledger entries"
              autoComplete="off"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="erp-ledger-search-clear"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="erp-ledger-pay-actions">
            <Button
              type="button"
              onClick={onReceiveIn}
              variant="outline"
              className="erp-ledger-pay-btn erp-ledger-pay-btn-in border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" /> Receive In
            </Button>
            <Button
              type="button"
              onClick={onPayOut}
              variant="outline"
              className="erp-ledger-pay-btn erp-ledger-pay-btn-out border-rose-200 text-rose-700 hover:bg-rose-50"
            >
              <ArrowUpRight className="w-3.5 h-3.5" /> Pay Out
            </Button>
          </div>
        </div>
      </div>

      <div className="erp-ledger-filters-row erp-ledger-filters-row-secondary">
        <div className="erp-ledger-filter-group">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden />
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="erp-ledger-select"
            aria-label="Filter by category"
          >
            {LEDGER_CATEGORY_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={entryType}
            onChange={(e) => onEntryTypeChange(e.target.value)}
            className="erp-ledger-select"
            aria-label="Filter by entry type"
          >
            {LEDGER_ENTRY_TYPE_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="erp-ledger-date-group">
          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden />
          <label className="sr-only">From date</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="erp-ledger-date-input"
          />
          <span className="text-slate-400 text-xs">to</span>
          <label className="sr-only">To date</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="erp-ledger-date-input"
          />
        </div>

        <div className="erp-ledger-filter-meta">
          <span className="erp-ledger-result-count">
            <strong className="tabular-nums">{resultCount}</strong>
            {totalCount !== resultCount && (
              <> of <strong className="tabular-nums">{totalCount}</strong></>
            )}{" "}
            entries
          </span>
          {hasActiveFilters && (
            <button type="button" onClick={onClear} className="erp-ledger-clear-btn">
              Clear filters
            </button>
          )}
        </div>

        <div className="erp-ledger-export-group">
          <button type="button" onClick={onPrint} className="erp-ledger-action-btn" title="Print register">
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            type="button"
            onClick={onExportPdf}
            disabled={pdfLoading}
            className="erp-ledger-action-btn erp-ledger-action-primary"
            title="Download PDF"
          >
            {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            PDF
          </button>
        </div>
      </div>
    </div>
  );
}

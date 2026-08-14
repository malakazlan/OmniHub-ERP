"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import RegisterExportToolbar from "@/components/reports/RegisterExportToolbar";
import RegisterPrintView from "@/components/reports/RegisterPrintView";
import { ArrowLeft, Loader2, Search } from "lucide-react";

/**
 * Shared ERP report layout: header, optional date filters, stats, search, register + print host.
 */
export default function ReportShell({
  surfaceClass = "erp-reports-surface",
  accentClass = "",
  badge,
  badgeIcon: BadgeIcon,
  title,
  description,
  backHref = "/reports",
  backLabel = "Reports",
  headerActions,
  filterBar,
  stats,
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search...",
  registerTitle,
  registerMeta,
  onPrint,
  onExportPdf,
  pdfLoading = false,
  exportDisabled = false,
  exportCount = 0,
  exportLabel = "records",
  loading = false,
  loadingOnly = false,
  children,
  printRef,
  printTitle,
  printSubtitle,
  companySettings,
  printColumns = [],
  printRows = [],
  printFooters = [],
}) {
  if (loadingOnly) {
    return (
      <div className={`min-h-[400px] flex items-center justify-center ${surfaceClass}`}>
        <Loader2 className={`w-8 h-8 animate-spin ${accentClass || "text-slate-500"}`} />
      </div>
    );
  }

  return (
    <div className={`${surfaceClass} page-enter pb-8`}>
      <div className="erp-reports-page space-y-5">
        <header className="erp-reports-page-header">
          <div>
            {badge && (
              <div className="erp-reports-page-badge">
                {BadgeIcon && <BadgeIcon className="w-3.5 h-3.5" />}
                {badge}
              </div>
            )}
            <h1 className="erp-reports-page-title">{title}</h1>
            {description && <p className="erp-reports-page-desc">{description}</p>}
          </div>
          <div className="erp-reports-header-actions">
            {headerActions}
            <Link href={backHref}>
              <Button variant="outline" className="border-slate-200 text-slate-600">
                <ArrowLeft className="w-4 h-4" /> {backLabel}
              </Button>
            </Link>
          </div>
        </header>

        {filterBar}

        {stats && stats.length > 0 && (
          <div className="erp-reports-stats">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className={`erp-reports-stat${stat.warn ? " is-warn" : ""}`}>
                  {Icon && (
                    <div className="erp-reports-stat-icon">
                      <Icon className="w-4 h-4" />
                    </div>
                  )}
                  <div>
                    <p className="erp-reports-stat-label">{stat.label}</p>
                    <p className={`erp-reports-stat-value${stat.valueClass ? ` ${stat.valueClass}` : ""}`}>
                      {stat.value}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {onSearchChange && (
          <div className="erp-reports-toolbar">
            <div className="erp-reports-search-wrap">
              <Search className="erp-reports-search-icon" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery || ""}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="erp-reports-register">
          <div className="erp-reports-register-head">
            <div>
              {registerTitle && <p className="erp-reports-register-title">{registerTitle}</p>}
              {registerMeta && <p className="erp-reports-register-meta">{registerMeta}</p>}
            </div>
            {(onPrint || onExportPdf) && (
              <RegisterExportToolbar
                onPrint={onPrint}
                onExportPdf={onExportPdf}
                pdfLoading={pdfLoading}
                disabled={exportDisabled || loading}
                resultCount={exportCount}
                label={exportLabel}
              />
            )}
          </div>
          {children}
        </div>
      </div>

      {printRef && (
        <div className="erp-register-print-host" aria-hidden>
          <RegisterPrintView
            ref={printRef}
            title={printTitle || title}
            subtitle={printSubtitle || ""}
            company={companySettings}
            columns={printColumns}
            rows={printRows}
            footers={printFooters}
          />
        </div>
      )}
    </div>
  );
}

export function ReportDateFilter({ from, to, onFromChange, onToChange, onApply, onClear, accentBtnClass = "bg-slate-800" }) {
  return (
    <div className="erp-reports-filter-bar">
      <div className="erp-reports-filter-field">
        <label>From</label>
        <input type="date" value={from} onChange={(e) => onFromChange(e.target.value)} className="erp-finance-input" />
      </div>
      <div className="erp-reports-filter-field">
        <label>To</label>
        <input type="date" value={to} onChange={(e) => onToChange(e.target.value)} className="erp-finance-input" />
      </div>
      <Button onClick={onApply} className={`${accentBtnClass} border-0`}>Apply filter</Button>
      {(from || to) && (
        <button type="button" onClick={onClear} className="text-xs text-slate-500 hover:text-slate-800 underline self-end pb-2">
          Clear
        </button>
      )}
    </div>
  );
}

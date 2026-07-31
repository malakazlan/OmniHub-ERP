"use client";

import Link from "next/link";

const ACCENT = {
  dashboard: {
    icon: "bg-blue-50 text-[#0F52BA] ring-1 ring-blue-100",
    bar: "bg-[#0F52BA]",
    borderTop: "border-t-[#0F52BA]",
  },
  farmers: {
    icon: "bg-emerald-50 text-[#107C41] ring-1 ring-emerald-100",
    bar: "bg-[#107C41]",
    borderTop: "border-t-[#107C41]",
  },
  companies: {
    icon: "bg-blue-50 text-blue-600 ring-1 ring-blue-100",
    bar: "bg-acc-companies",
    borderTop: "border-t-blue-500",
  },
  shops: {
    icon: "bg-amber-50 text-amber-600 ring-1 ring-amber-100",
    bar: "bg-acc-shops",
    borderTop: "border-t-amber-500",
  },
  products: {
    icon: "bg-violet-50 text-violet-600 ring-1 ring-violet-100",
    bar: "bg-acc-products",
    borderTop: "border-t-violet-500",
  },
  purchases: {
    icon: "bg-blue-50 text-blue-600 ring-1 ring-blue-100",
    bar: "bg-acc-purchases",
    borderTop: "border-t-blue-500",
  },
  sales: {
    icon: "bg-green-50 text-green-600 ring-1 ring-green-100",
    bar: "bg-acc-sales",
    borderTop: "border-t-green-500",
  },
  orders: {
    icon: "bg-orange-50 text-orange-600 ring-1 ring-orange-100",
    bar: "bg-acc-orders",
    borderTop: "border-t-orange-500",
  },
  transport: {
    icon: "bg-cyan-50 text-cyan-600 ring-1 ring-cyan-100",
    bar: "bg-acc-transport",
    borderTop: "border-t-cyan-500",
  },
  accounts: {
    icon: "bg-sky-50 text-sky-600 ring-1 ring-sky-100",
    bar: "bg-acc-accounts",
    borderTop: "border-t-sky-500",
  },
  hr: {
    icon: "bg-pink-50 text-pink-600 ring-1 ring-pink-100",
    bar: "bg-acc-hr",
    borderTop: "border-t-pink-500",
  },
  reports: {
    icon: "bg-teal-50 text-teal-600 ring-1 ring-teal-100",
    bar: "bg-acc-reports",
    borderTop: "border-t-teal-500",
  },
  settings: {
    icon: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
    bar: "bg-acc-settings",
    borderTop: "border-t-slate-400",
  },
};

export function PageHeader({ module = "dashboard", title, description, icon: Icon, breadcrumbs = [], actions }) {
  const accent = ACCENT[module] || ACCENT.dashboard;

  return (
    <div className="page-enter">
      {breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-slate-300">/</span>}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-slate-700 transition-colors">{crumb.label}</Link>
              ) : (
                <span className="text-slate-600">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          {Icon && (
            <div className={`w-[52px] h-[52px] rounded-2xl flex items-center justify-center flex-shrink-0 ${accent.icon}`}>
              <Icon className="w-6 h-6" strokeWidth={1.85} />
            </div>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">{title}</h1>
            {description && <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">{description}</p>}
          </div>
        </div>
        {actions && (
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0 [&>*]:w-full sm:[&>*]:w-auto">
            {actions}
          </div>
        )}
      </div>

      <div className={`h-1 w-14 rounded-full mt-5 ${accent.bar}`} />
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, module = "dashboard", subtext, loading = false, valueClassName = "", className = "" }) {
  const accent = ACCENT[module] || ACCENT.dashboard;

  return (
    <div className={`card-hover bg-white rounded-2xl border border-slate-200/80 border-t-[3px] ${accent.borderTop} p-4 sm:p-5 shadow-sm ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{label}</p>
          {loading ? (
            <div className="skeleton h-7 w-24" />
          ) : (
            <h3 className={`text-2xl font-black text-slate-900 tracking-tight font-mono truncate ${valueClassName}`}>{value}</h3>
          )}
          {subtext && !loading && <p className="text-[10px] text-slate-400 mt-1">{subtext}</p>}
        </div>
        {Icon && (
          <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${accent.icon}`}>
            <Icon className="w-5 h-5" strokeWidth={1.75} />
          </div>
        )}
      </div>
    </div>
  );
}

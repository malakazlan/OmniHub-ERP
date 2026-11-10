"use client";

import React from "react";
import { formatDate } from "@/lib/formatters";
import { companyAddressLine } from "@/lib/companyProfile";

export const DEFAULT_COMPANY = {
  company_name: "Omni Hub",
  company_address: "",
  company_phone: "",
  company_email: "",
  tagline: "Wholesale Distribution · Operations · Finance",
  ntn: "",
  strn: "",
};

/** Section divider — items, charges, payment, etc. */
export function BillSection({ title, children, className = "" }) {
  return (
    <section className={`${className}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 shrink-0">{title}</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>
      {children}
    </section>
  );
}

/** Compact key–value row grid for party / meta blocks */
export function BillFieldGrid({ rows, columns = 2 }) {
  if (!rows?.length) return null;
  return (
    <dl
      className={`grid gap-x-4 gap-y-1 text-[11px] leading-snug ${
        columns === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"
      }`}
    >
      {rows.map(({ label, value }) => (
        <div key={label} className="flex gap-2 min-w-0">
          <dt className="text-slate-500 shrink-0 w-[88px] sm:w-[96px]">{label}</dt>
          <dd className="font-medium text-slate-900 truncate">{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Right-aligned summary lines (charges, totals, payment) */
export function BillSummaryTable({ lines, highlightKey }) {
  return (
    <table className="w-full max-w-xs ml-auto text-[11px]">
      <tbody>
        {lines.map(({ key, label, value, bold, accent, danger }) => (
          <tr
            key={key}
            className={
              highlightKey === key
                ? "bg-slate-100"
                : accent
                  ? "bg-teal-50/80"
                  : danger
                    ? "bg-rose-50/60"
                    : ""
            }
          >
            <td className={`py-1 pr-3 text-right ${bold ? "font-semibold text-slate-800" : "text-slate-600"}`}>
              {label}
            </td>
            <td
              className={`py-1 pl-2 text-right font-mono tabular-nums w-[100px] ${
                bold ? "font-bold text-slate-900" : ""
              } ${accent ? "text-teal-800 font-bold" : ""} ${danger ? "text-rose-700 font-bold" : ""}`}
            >
              {value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function DocumentBillShell({
  company = DEFAULT_COMPANY,
  documentTitle = "Document",
  refLabel = "Ref.",
  refNo = "—",
  date,
  footerNote,
  signatureLabel = "Authorized signatory",
  children,
}) {
  const c = { ...DEFAULT_COMPANY, ...company };
  const contactLine = [c.company_phone, c.company_email].filter(Boolean).join(" · ");
  const addressLine = companyAddressLine(c);

  return (
    <article className="erp-document-bill w-full max-w-[640px] mx-auto bg-white text-slate-800 border border-slate-200 rounded-md shadow-sm overflow-hidden text-[12px] leading-normal">
      <header className="flex items-start justify-between gap-3 px-3 py-2.5 bg-slate-800 text-white border-b border-teal-600/40">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold tracking-tight truncate">{c.company_name}</p>
          {c.tagline && <p className="text-[10px] text-slate-400 truncate">{c.tagline}</p>}
          {(addressLine || contactLine) && (
            <p className="text-[9px] text-slate-400 mt-0.5 line-clamp-2">
              {[addressLine, contactLine].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-teal-300">{documentTitle}</p>
          <p className="text-[10px] font-mono text-white/90 mt-0.5">{refNo}</p>
          <p className="text-[9px] text-slate-400 mt-0.5">{date ? formatDate(date) : "—"}</p>
        </div>
      </header>

      <div className="px-3 py-2.5 space-y-3 border-b border-slate-100 bg-white">{children}</div>

      {footerNote && (
        <p className="px-3 py-1.5 text-[9px] text-slate-400 text-center border-t border-slate-100">{footerNote}</p>
      )}

      <footer className="px-3 py-2 flex justify-end border-t border-slate-200 bg-slate-50/80">
        <div className="text-right">
          <div className="w-36 border-t border-slate-400 mt-6 mb-1" />
          <p className="text-[9px] font-medium text-slate-600">{signatureLabel}</p>
        </div>
      </footer>
    </article>
  );
}

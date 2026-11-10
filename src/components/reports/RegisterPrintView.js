"use client";

import React, { forwardRef, useMemo } from "react";
import {
  layoutRegisterColumns,
  normalizeRegisterFooter,
  formatPrintCompanyMeta,
} from "@/lib/registerPrintLayout";

const RegisterPrintView = forwardRef(function RegisterPrintView(
  {
    title,
    subtitle = "",
    company,
    columns = [],
    rows = [],
    footers = [],
    showRowNum = true,
  },
  ref
) {
  const companyName = company?.company_name || "Omni Hub";
  const companyLines = formatPrintCompanyMeta(company);
  const printedAt = new Date().toLocaleString();
  const layout = useMemo(() => layoutRegisterColumns(columns), [columns]);
  const footer = useMemo(
    () => normalizeRegisterFooter(footers, layout.columns),
    [footers, layout.columns]
  );

  return (
    <div ref={ref} className="erp-register-print-root">
      <header className="erp-register-print-banner">
        <div className="erp-register-print-banner-main">
          <p className="erp-register-print-brand">{companyName}</p>
          {companyLines.map((line) => (
            <p key={line} className="erp-register-print-brand-meta">{line}</p>
          ))}
        </div>
        <div className="erp-register-print-banner-side">
          <p className="erp-register-print-report-type">Register Report</p>
          <p className="erp-register-print-datetime">{printedAt}</p>
          <p className="erp-register-print-records">{rows.length} records</p>
        </div>
      </header>

      <div className="erp-register-print-titlebar">
        <div>
          <h1 className="erp-register-print-title">{title}</h1>
          {subtitle ? <p className="erp-register-print-subtitle">{subtitle}</p> : null}
        </div>
      </div>

      <table className="erp-register-print-table">
        <colgroup>
          {showRowNum ? <col style={{ width: `${layout.serialPct}%` }} /> : null}
          {layout.columns.map((col) => (
            <col key={col.key || col.label} style={{ width: `${col.widthPct}%` }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {showRowNum ? <th className="col-serial">#</th> : null}
            {layout.columns.map((col) => (
              <th
                key={col.key || col.label}
                className={col.align === "right" ? "num" : col.align === "center" ? "center" : ""}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.id ?? idx}>
              {showRowNum ? <td className="serial">{idx + 1}</td> : null}
              {layout.columns.map((col) => {
                const raw = col.get ? col.get(row, idx) : row[col.key];
                const value = raw == null || raw === "" ? "—" : raw;
                const toneVal = typeof col.tone === "function" ? col.tone(row) : col.tone;
                return (
                  <td
                    key={col.key || col.label}
                    className={[
                      col.align === "right" ? "num" : col.align === "center" ? "center" : "",
                      toneVal ? `tone-${toneVal}` : "",
                      col.bold ? "is-bold" : "",
                    ].filter(Boolean).join(" ")}
                  >
                    {value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        {footer ? (
          <tfoot>
            <tr>
              {showRowNum ? <td className="tfoot-empty" /> : null}
              {layout.columns.map((col, i) => {
                if (i === footer.valueIdx) {
                  return (
                    <td key={col.key || col.label} className="num tfoot-value">
                      {footer.value}
                    </td>
                  );
                }
                if (i === footer.labelIdx) {
                  return (
                    <td key={col.key || col.label} className="num tfoot-label">
                      {footer.label}
                    </td>
                  );
                }
                return <td key={col.key || col.label} className="tfoot-empty" />;
              })}
            </tr>
          </tfoot>
        ) : null}
      </table>

      <footer className="erp-register-print-footer">
        <span>{companyName}</span>
        <span>{title}</span>
        <span>Generated {printedAt}</span>
      </footer>
    </div>
  );
});

export default RegisterPrintView;

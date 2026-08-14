"use client";

import React, { forwardRef } from "react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { LedgerPrintParticulars } from "@/components/accounts/LedgerPrintParticulars";

function money(n) {
  const v = Number(n) || 0;
  if (v === 0) return "";
  return formatCurrency(v, false);
}

/** Clean table used only for browser print. */
const GeneralLedgerPrintView = forwardRef(function GeneralLedgerPrintView(
  { entries = [], showAccountColumn = false, totals, printMeta },
  ref
) {
  const totalsColSpan = showAccountColumn ? 4 : 3;

  return (
    <div ref={ref} className="erp-ledger-print-root">
      {printMeta && (
        <header className="erp-ledger-print-doc-header">
          <div>
            <h1>{printMeta.title}</h1>
            {printMeta.subtitle && <p>{printMeta.subtitle}</p>}
          </div>
          <div className="erp-ledger-print-doc-meta">
            <p>{new Date().toLocaleString()}</p>
            <p>{entries.length} entries</p>
          </div>
        </header>
      )}

      <table className="erp-ledger-print-table">
        <colgroup>
          {showAccountColumn ? (
            <>
              <col style={{ width: "2.5%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "36%" }} />
              <col style={{ width: "9.2%" }} />
              <col style={{ width: "9.2%" }} />
              <col style={{ width: "9.1%" }} />
            </>
          ) : (
            <>
              <col style={{ width: "2.5%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "48%" }} />
              <col style={{ width: "13.2%" }} />
              <col style={{ width: "13.2%" }} />
              <col style={{ width: "12.9%" }} />
            </>
          )}
        </colgroup>
        <thead>
          <tr>
            <th className="col-serial">#</th>
            <th className="col-date">Date</th>
            {showAccountColumn && <th className="col-account">Account</th>}
            <th className="col-particulars">Particulars</th>
            <th className="col-amount num">Debit</th>
            <th className="col-amount num">Credit</th>
            <th className="col-amount num">Balance</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((row, idx) => (
            <tr key={row.id ?? idx}>
              <td className="serial">{idx + 1}</td>
              <td className="date">{formatDate(row.date)}</td>
              {showAccountColumn && (
                <td className="account">
                  <span className="erp-ledger-print-account-name">
                    {row.account?.name || "—"}
                  </span>
                  {row.account?.code ? (
                    <span className="erp-ledger-print-account-meta">{row.account.code}</span>
                  ) : null}
                </td>
              )}
              <td className="particulars">
                <LedgerPrintParticulars entry={row} />
              </td>
              <td className="num debit">{money(row.debit)}</td>
              <td className="num credit">{money(row.credit)}</td>
              <td className="num balance">{money(row.balance)}</td>
            </tr>
          ))}
        </tbody>
        {totals && (
          <tfoot>
            <tr>
              <td colSpan={totalsColSpan} className="totals-label">
                Totals
              </td>
              <td className="num debit">{money(totals.debit)}</td>
              <td className="num credit">{money(totals.credit)}</td>
              <td className="num balance">{money(Math.abs(totals.net))}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
});

export default GeneralLedgerPrintView;

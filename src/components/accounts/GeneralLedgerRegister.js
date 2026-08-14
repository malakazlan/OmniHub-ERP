"use client";

import React, { useEffect, useRef, forwardRef } from "react";
import { BookOpen, Loader2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { LedgerEntryParticulars } from "@/components/accounts/LedgerEntryParticulars";
import { ledgerEntryOpensInvoice } from "@/lib/ledgerEnrichment";

const GeneralLedgerRegister = forwardRef(function GeneralLedgerRegister(
  {
    entries = [],
    showAccountColumn = false,
    loading = false,
    onOpenDocument,
    totals,
  },
  ref
) {
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (loading || entries.length === 0) return;
    const scrollToBottom = () => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
      bottomRef.current?.scrollIntoView({ block: "end", behavior: "auto" });
    };
    requestAnimationFrame(scrollToBottom);
    const t = setTimeout(scrollToBottom, 50);
    return () => clearTimeout(t);
  }, [entries, loading]);

  const totalsColSpan = showAccountColumn ? 4 : 3;

  return (
    <div ref={ref} className="erp-ledger-grid-wrap">
      <div ref={scrollRef} className="erp-ledger-grid-scroll">
        {loading ? (
          <div className="h-52 flex items-center justify-center">
            <Loader2 className="w-7 h-7 text-slate-400 animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="erp-ledger-empty">
            <BookOpen className="w-9 h-9 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-600">No entries match your filters</p>
          </div>
        ) : (
          <table className="erp-ledger-grid">
            <colgroup>
              {showAccountColumn ? (
                <>
                  <col style={{ width: "2.5%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "36%" }} />
                  <col style={{ width: "9.2%" }} />
                  <col style={{ width: "9.2%" }} />
                  <col style={{ width: "9.1%" }} />
                </>
              ) : (
                <>
                  <col style={{ width: "2.5%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "48%" }} />
                  <col style={{ width: "13.5%" }} />
                  <col style={{ width: "13.5%" }} />
                  <col style={{ width: "13.5%" }} />
                </>
              )}
            </colgroup>
            <thead>
              <tr>
                <th className="erp-lg-th erp-lg-th-num">#</th>
                <th className="erp-lg-th erp-lg-th-date">Date</th>
                {showAccountColumn && <th className="erp-lg-th erp-lg-th-account">Account</th>}
                <th className="erp-lg-th erp-lg-th-wide">Particulars</th>
                <th className="erp-lg-th erp-lg-th-money">Debit</th>
                <th className="erp-lg-th erp-lg-th-money">Credit</th>
                <th className="erp-lg-th erp-lg-th-money">Balance</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((row, idx) => {
                const clickable = ledgerEntryOpensInvoice(row) && onOpenDocument;
                return (
                  <tr
                    key={row.id ?? idx}
                    className={`erp-lg-row${clickable ? " is-clickable" : ""}`}
                    onClick={() => clickable && onOpenDocument(row)}
                  >
                    <td className="erp-lg-td erp-lg-td-num">{idx + 1}</td>
                    <td className="erp-lg-td erp-lg-td-date">{formatDate(row.date)}</td>
                    {showAccountColumn && (
                      <td className="erp-lg-td erp-lg-td-account">
                        <span className="erp-lg-account-name">
                          {row.account?.name || "—"}
                        </span>
                        {row.account?.code ? (
                          <span className="erp-lg-account-meta">{row.account.code}</span>
                        ) : null}
                      </td>
                    )}
                    <td className="erp-lg-td erp-lg-td-wide">
                      <LedgerEntryParticulars entry={row} onOpenDocument={onOpenDocument} />
                    </td>
                    <td className="erp-lg-td erp-lg-td-money erp-lg-debit">
                      {row.debit > 0 ? formatCurrency(row.debit) : "—"}
                    </td>
                    <td className="erp-lg-td erp-lg-td-money erp-lg-credit">
                      {row.credit > 0 ? formatCurrency(row.credit) : "—"}
                    </td>
                    <td className="erp-lg-td erp-lg-td-money erp-lg-balance">
                      {formatCurrency(row.balance)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {totals && (
              <tfoot>
                <tr className="erp-lg-foot">
                  <td colSpan={totalsColSpan} className="erp-lg-td erp-lg-td-total-label">
                    Totals
                  </td>
                  <td className="erp-lg-td erp-lg-td-money erp-lg-debit">{formatCurrency(totals.debit)}</td>
                  <td className="erp-lg-td erp-lg-td-money erp-lg-credit">{formatCurrency(totals.credit)}</td>
                  <td className="erp-lg-td erp-lg-td-money erp-lg-balance">{formatCurrency(Math.abs(totals.net))}</td>
                </tr>
              </tfoot>
            )}
          </table>
        )}
        <div ref={bottomRef} className="h-px" aria-hidden />
      </div>

      {!loading && entries.length > 0 && (
        <div className="erp-ledger-grid-footer no-print">
          <span>
            <strong className="tabular-nums">{entries.length}</strong> entries · oldest at top
          </span>
        </div>
      )}
    </div>
  );
});

export default GeneralLedgerRegister;

"use client";

import React, { useState } from "react";
import { BookText, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

export default function JournalRegister({ entries = [], loading = false }) {
  const [expandedId, setExpandedId] = useState(null);
  const grandTotal = entries.reduce((s, e) => s + (e.totalDebit || 0), 0);

  return (
    <>
      <div className="erp-accounts-grid-wrap">
        <div className="erp-accounts-grid-scroll">
          {loading ? (
            <div className="h-52 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-teal-500 animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <div className="erp-ledger-empty">
              <BookText className="w-9 h-9 text-teal-200 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">No journal entries posted yet</p>
            </div>
          ) : (
            <div className="erp-journal-list">
              {entries.map((entry, idx) => {
                const open = expandedId === entry.id;
                return (
                  <div key={entry.id} className="erp-journal-entry">
                    <button
                      type="button"
                      onClick={() => setExpandedId(open ? null : entry.id)}
                      className="erp-journal-entry-head"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {open ? (
                          <ChevronDown className="w-4 h-4 text-teal-600 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span className="erp-lg-td-num text-xs w-6">{idx + 1}</span>
                        <div className="min-w-0 text-left">
                          <p className="erp-journal-entry-title">{entry.description}</p>
                          <p className="erp-journal-entry-meta">
                            <span className="erp-fin-doc-no">{entry.entryNumber}</span>
                            {" · "}
                            {formatDate(entry.entryDate)}
                          </p>
                        </div>
                      </div>
                      <span className="erp-journal-entry-amount">{formatCurrency(entry.totalDebit)}</span>
                    </button>
                    {open && (
                      <div className="erp-journal-entry-body">
                        <table className="erp-ledger-grid erp-journal-detail-grid">
                          <thead>
                            <tr>
                              <th className="erp-lg-th erp-fin-th">Account</th>
                              <th className="erp-lg-th erp-fin-th">Description</th>
                              <th className="erp-lg-th erp-fin-th erp-lg-th-money">Debit</th>
                              <th className="erp-lg-th erp-fin-th erp-lg-th-money">Credit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entry.lines.map((line) => (
                              <tr key={line.id} className="erp-lg-row">
                                <td className="erp-lg-td">
                                  <span className="erp-lg-account-name">{line.account?.name || "—"}</span>
                                </td>
                                <td className="erp-lg-td text-xs text-slate-600">{line.description || "—"}</td>
                                <td className="erp-lg-td erp-lg-td-money erp-lg-debit">
                                  {line.debit > 0 ? formatCurrency(line.debit) : "—"}
                                </td>
                                <td className="erp-lg-td erp-lg-td-money erp-lg-credit">
                                  {line.credit > 0 ? formatCurrency(line.credit) : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {!loading && entries.length > 0 && (
        <div className="erp-ac-grid-footer erp-journal-footer">
          <span>
            <strong className="tabular-nums">{entries.length}</strong> entries · total posted{" "}
            <strong className="tabular-nums">{formatCurrency(grandTotal)}</strong>
          </span>
        </div>
      )}
    </>
  );
}

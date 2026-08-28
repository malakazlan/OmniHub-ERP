"use client";

import React from "react";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { transferTypeLabel } from "@/lib/moneyTransfer";

const TYPE_BADGE = {
  cash_cash: "erp-xfer-badge-cash-cash",
  cash_bank: "erp-xfer-badge-cash-bank",
  bank_bank: "erp-xfer-badge-bank-bank",
  bank_cash: "erp-xfer-badge-bank-cash",
};

export default function MoneyTransfersRegister({ transfers = [], loading = false }) {
  const grandTotal = transfers.reduce((sum, row) => sum + (row.amount || 0), 0);

  return (
    <>
      <div className="erp-accounts-grid-wrap erp-xfer-grid">
        <div className="erp-accounts-grid-scroll">
          {loading ? (
            <div className="h-52 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
            </div>
          ) : transfers.length === 0 ? (
            <div className="erp-xfer-empty">
              <div className="erp-xfer-empty-icon">
                <ArrowRightLeft className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700">No money transfers posted yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Use <strong className="text-slate-700">New transfer</strong> or click a transfer type above to post your first entry.
              </p>
            </div>
          ) : (
            <table className="erp-ledger-grid">
              <thead>
                <tr>
                  <th className="erp-lg-th erp-xfer-th w-10">#</th>
                  <th className="erp-lg-th erp-xfer-th">Transfer #</th>
                  <th className="erp-lg-th erp-xfer-th">Date</th>
                  <th className="erp-lg-th erp-xfer-th">Type</th>
                  <th className="erp-lg-th erp-xfer-th">From</th>
                  <th className="erp-lg-th erp-xfer-th">To</th>
                  <th className="erp-lg-th erp-xfer-th erp-lg-th-money">Amount</th>
                  <th className="erp-lg-th erp-xfer-th">Recorded by</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((row, idx) => (
                  <tr key={row.id} className="erp-lg-row hover:bg-blue-50/40">
                    <td className="erp-lg-td erp-lg-td-num text-xs text-slate-500">{idx + 1}</td>
                    <td className="erp-lg-td">
                      <span className="erp-xfer-doc-no">{row.transferNumber}</span>
                    </td>
                    <td className="erp-lg-td text-sm text-slate-600">{formatDate(row.transferDate)}</td>
                    <td className="erp-lg-td">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          TYPE_BADGE[row.transferType] || "bg-slate-50 text-slate-700 border-slate-200"
                        }`}
                      >
                        {transferTypeLabel(row.transferType)}
                      </span>
                    </td>
                    <td className="erp-lg-td">
                      <span className="erp-lg-account-name">{row.fromAccount?.name || "—"}</span>
                    </td>
                    <td className="erp-lg-td">
                      <span className="erp-lg-account-name">{row.toAccount?.name || "—"}</span>
                    </td>
                    <td className="erp-lg-td erp-lg-td-money font-bold text-slate-900">
                      {formatCurrency(row.amount || 0)}
                    </td>
                    <td className="erp-lg-td text-xs text-slate-600">{row.createdByName || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {transfers.length > 0 && (
        <div className="erp-ac-grid-footer erp-journal-footer bg-blue-50/60 border-t border-blue-100 text-slate-700">
          <span>
            <strong className="tabular-nums">{transfers.length}</strong> transfer{transfers.length === 1 ? "" : "s"} · total{" "}
            <strong className="tabular-nums text-blue-800">{formatCurrency(grandTotal)}</strong>
          </span>
        </div>
      )}
    </>
  );
}

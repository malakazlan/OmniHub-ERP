"use client";

import React from "react";
import { Wallet2, Loader2, Trash2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

function PaymentBadge({ method }) {
  const m = (method || "cash").toLowerCase();
  return (
    <span className={`erp-pay-method erp-pay-method-${m === "bank_transfer" ? "bank" : m}`}>
      {m === "split" ? "Cash + Bank" : m === "bank" ? "Bank" : "Cash"}
    </span>
  );
}

export default function ExpensesRegister({
  rows = [],
  loading = false,
  onDelete,
  totalAmount = 0,
}) {
  return (
    <>
      <div className="erp-accounts-grid-wrap">
        <div className="erp-accounts-grid-scroll">
          {loading ? (
            <div className="h-52 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-teal-500 animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <div className="erp-ledger-empty">
              <Wallet2 className="w-9 h-9 text-teal-200 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">No expenses recorded yet</p>
            </div>
          ) : (
            <table className="erp-ledger-grid erp-fin-grid">
              <colgroup>
                <col style={{ width: "2.5%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "24%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "5%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="erp-lg-th erp-fin-th erp-lg-th-num">#</th>
                  <th className="erp-lg-th erp-fin-th">Expense #</th>
                  <th className="erp-lg-th erp-fin-th">Title</th>
                  <th className="erp-lg-th erp-fin-th">Category</th>
                  <th className="erp-lg-th erp-fin-th erp-ac-th-center">Payment</th>
                  <th className="erp-lg-th erp-fin-th erp-lg-th-money">Amount</th>
                  <th className="erp-lg-th erp-fin-th">Date</th>
                  <th className="erp-lg-th erp-fin-th erp-ac-th-center"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.id} className="erp-lg-row erp-fin-row">
                    <td className="erp-lg-td erp-lg-td-num">{idx + 1}</td>
                    <td className="erp-lg-td">
                      <span className="erp-fin-doc-no">{row.expenseNumber}</span>
                    </td>
                    <td className="erp-lg-td erp-ac-td-name">
                      <span className="erp-lg-account-name">{row.expenseTitle}</span>
                      {row.description && (
                        <span className="erp-lg-account-meta">{row.description}</span>
                      )}
                    </td>
                    <td className="erp-lg-td">
                      {row.category?.name ? (
                        <span className="erp-fin-cat-pill">{row.category.name}</span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="erp-lg-td erp-ac-td-center">
                      <PaymentBadge method={row.paymentMethod} />
                      {(row.cashAmount > 0 && row.bankAmount > 0) && (
                        <span className="erp-lg-account-meta block mt-0.5">
                          {formatCurrency(row.cashAmount)} + {formatCurrency(row.bankAmount)}
                        </span>
                      )}
                    </td>
                    <td className="erp-lg-td erp-lg-td-money erp-ac-balance-neg">
                      {formatCurrency(row.amount)}
                    </td>
                    <td className="erp-lg-td erp-lg-td-date">{formatDate(row.expenseDate)}</td>
                    <td className="erp-lg-td erp-ac-td-center">
                      <button
                        type="button"
                        onClick={() => onDelete?.(row)}
                        className="erp-fin-icon-btn erp-fin-icon-btn-danger"
                        title="Delete expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="erp-lg-foot erp-fin-foot">
                  <td colSpan={5} className="erp-lg-td erp-lg-td-total-label">
                    {rows.length} expense{rows.length === 1 ? "" : "s"}
                  </td>
                  <td className="erp-lg-td erp-lg-td-money erp-ac-balance-neg">
                    {formatCurrency(totalAmount)}
                  </td>
                  <td colSpan={2} className="erp-lg-td" />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
      {!loading && rows.length > 0 && (
        <div className="erp-ac-grid-footer">
          <span>
            Showing <strong className="tabular-nums">{rows.length}</strong> expenses
          </span>
        </div>
      )}
    </>
  );
}

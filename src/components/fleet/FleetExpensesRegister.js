"use client";

import React from "react";
import { Loader2, Wallet, Trash2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { EXPENSE_TYPES } from "@/components/fleet/fleetConstants";

const TYPE_LABELS = Object.fromEntries(EXPENSE_TYPES.map((t) => [t.key, t.label]));

export default function FleetExpensesRegister({
  rows = [],
  loading = false,
  onDeleteExpense,
  canDelete = false,
}) {
  if (loading) {
    return (
      <div className="h-52 flex items-center justify-center">
        <Loader2 className="w-7 h-7 text-cyan-600 animate-spin" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="erp-ac-empty py-16">
        <Wallet className="w-10 h-10 text-cyan-200 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-600">No fleet expenses recorded</p>
        <p className="text-xs text-slate-500 mt-1">Pay fuel, maintenance, or repair from cash or bank.</p>
      </div>
    );
  }

  const total = rows.reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <div className="erp-accounts-grid-wrap">
      <div className="erp-accounts-grid-scroll">
        <table className="erp-ledger-grid erp-fleet-grid">
          <colgroup>
            <col style={{ width: "3%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "5%" }} />
          </colgroup>
          <thead>
            <tr>
              <th className="erp-lg-th erp-fleet-th erp-lg-th-num">#</th>
              <th className="erp-lg-th erp-fleet-th">Date</th>
              <th className="erp-lg-th erp-fleet-th">Vehicle</th>
              <th className="erp-lg-th erp-fleet-th">Type</th>
              <th className="erp-lg-th erp-fleet-th">Ref</th>
              <th className="erp-lg-th erp-fleet-th">Description</th>
              <th className="erp-lg-th erp-fleet-th erp-lg-th-money">Amount</th>
              <th className="erp-lg-th erp-fleet-th">Paid from</th>
              <th className="erp-lg-th erp-fleet-th erp-fleet-th-center">Ledger</th>
              <th className="erp-lg-th erp-fleet-th" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.id} className="erp-lg-row erp-fleet-row">
                <td className="erp-lg-td erp-lg-td-num text-slate-400">{idx + 1}</td>
                <td className="erp-lg-td erp-lg-td-date">{formatDate(row.expenseDate)}</td>
                <td className="erp-lg-td">
                  <span className="erp-fleet-plate is-sm">{row.vehicle?.registrationNumber || "—"}</span>
                </td>
                <td className="erp-lg-td">
                  <span className="erp-fleet-type-pill">{TYPE_LABELS[row.expenseType] || row.expenseType}</span>
                </td>
                <td className="erp-lg-td font-mono text-[10px] text-slate-500">VEX-{row.id}</td>
                <td className="erp-lg-td text-sm text-slate-700">{row.description || "—"}</td>
                <td className="erp-lg-td erp-lg-td-money font-bold text-red-600">{formatCurrency(row.amount)}</td>
                <td className="erp-lg-td text-xs text-slate-700">{row.account?.name || "—"}</td>
                <td className="erp-lg-td erp-fleet-td-center">
                  {row.accountId ? (
                    <span className="erp-fleet-paid-badge">Posted</span>
                  ) : (
                    <span className="erp-fleet-unpaid-badge">Unpaid</span>
                  )}
                </td>
                <td className="erp-lg-td erp-fleet-td-center">
                  {canDelete && (
                    <button
                      type="button"
                      className="erp-fleet-icon-btn is-danger"
                      onClick={() => onDeleteExpense?.(row)}
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="erp-fleet-foot">
              <td colSpan={6} className="erp-lg-td text-xs font-bold uppercase text-slate-500">
                {rows.length} expenses
              </td>
              <td className="erp-lg-td erp-lg-td-money font-black">{formatCurrency(total)}</td>
              <td colSpan={3} className="erp-lg-td" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { Loader2, Banknote } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

export default function OwnerWithdrawalsRegister({ rows = [], loading = false }) {
  if (loading) {
    return (
      <div className="h-52 flex items-center justify-center">
        <Loader2 className="w-7 h-7 text-slate-500 animate-spin" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="erp-ac-empty py-16">
        <Banknote className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-600">No owner withdrawals recorded yet</p>
      </div>
    );
  }

  return (
    <div className="erp-accounts-grid-wrap">
      <div className="erp-accounts-grid-scroll">
        <table className="erp-ledger-grid erp-settings-grid">
          <colgroup>
            <col style={{ width: "3%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "27%" }} />
            <col style={{ width: "10%" }} />
          </colgroup>
          <thead>
            <tr>
              <th className="erp-lg-th erp-lg-th-num">#</th>
              <th className="erp-lg-th">Withdrawal #</th>
              <th className="erp-lg-th">Date</th>
              <th className="erp-lg-th">Paid from</th>
              <th className="erp-lg-th">Method</th>
              <th className="erp-lg-th erp-lg-th-money">Amount</th>
              <th className="erp-lg-th">Private note</th>
              <th className="erp-lg-th">By</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.id} className="erp-lg-row">
                <td className="erp-lg-td erp-lg-td-num text-slate-400">{idx + 1}</td>
                <td className="erp-lg-td font-mono text-xs font-semibold text-slate-800">{row.withdrawalNumber}</td>
                <td className="erp-lg-td erp-lg-td-date">{formatDate(row.withdrawalDate)}</td>
                <td className="erp-lg-td text-sm text-slate-800">{row.sourceAccount?.name || "—"}</td>
                <td className="erp-lg-td text-xs capitalize">{row.paymentMethod?.replace("_", " ")}</td>
                <td className="erp-lg-td erp-lg-td-money font-bold text-red-700">{formatCurrency(row.amount)}</td>
                <td className="erp-lg-td text-xs text-slate-600">{row.notes || "—"}</td>
                <td className="erp-lg-td text-xs text-slate-500">{row.createdBy?.name || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

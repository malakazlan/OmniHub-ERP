"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

export default function TransactionReportRegister({
  rows = [],
  loading = false,
  module = "sales",
  numberKey = "invoiceNumber",
  numberLabel = "Invoice #",
  dateKey = "saleDate",
  partyLabel = "Customer",
  getPartyName,
  onRowClick,
  emptyMessage = "No records found for the selected period.",
}) {
  const accent = module === "purchases" ? "text-acc-purchases" : "text-acc-sales";

  if (loading) {
    return (
      <div className="h-52 flex items-center justify-center">
        <Loader2 className={`w-7 h-7 animate-spin ${module === "purchases" ? "text-red-500" : "text-green-600"}`} />
      </div>
    );
  }

  if (rows.length === 0) {
    return <p className="text-sm text-slate-500 py-12 text-center">{emptyMessage}</p>;
  }

  return (
    <div className="erp-accounts-grid-wrap">
      <div className="erp-accounts-grid-scroll">
        <table className={`erp-ledger-grid erp-reports-grid is-${module}`}>
          <colgroup>
            <col style={{ width: "3%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "22%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "11%" }} />
          </colgroup>
          <thead>
            <tr>
              <th className="erp-lg-th erp-lg-th-num">#</th>
              <th className="erp-lg-th">{numberLabel}</th>
              <th className="erp-lg-th">Date</th>
              <th className="erp-lg-th">{partyLabel}</th>
              <th className="erp-lg-th erp-lg-th-num">Items</th>
              <th className="erp-lg-th erp-lg-th-money">Total</th>
              <th className="erp-lg-th erp-lg-th-money">Paid</th>
              <th className="erp-lg-th erp-lg-th-money">Due</th>
              <th className="erp-lg-th">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const total = row.totalAmount || 0;
              const paid = row.paidAmount || 0;
              const due = total - paid;
              const party = getPartyName
                ? getPartyName(row)
                : row.company?.name || row.shop?.name || row.farmer?.name || row.customerName || row.vendorName || "—";

              return (
                <tr
                  key={row.id}
                  className={`erp-lg-row${onRowClick ? " is-clickable" : ""}`}
                  onClick={() => onRowClick?.(row)}
                >
                  <td className="erp-lg-td erp-lg-td-num text-slate-400">{idx + 1}</td>
                  <td className="erp-lg-td">
                    <span className={`font-mono text-xs font-semibold ${accent}`}>
                      {row[numberKey] || "—"}
                    </span>
                  </td>
                  <td className="erp-lg-td erp-lg-td-date">{formatDate(row[dateKey])}</td>
                  <td className="erp-lg-td text-sm text-slate-800">{party}</td>
                  <td className="erp-lg-td erp-lg-td-num text-xs text-slate-500">{(row.items || []).length}</td>
                  <td className="erp-lg-td erp-lg-td-money font-semibold">{formatCurrency(total)}</td>
                  <td className="erp-lg-td erp-lg-td-money text-emerald-700">{formatCurrency(paid)}</td>
                  <td className={`erp-lg-td erp-lg-td-money${due > 0 ? " text-red-600" : ""}`}>
                    {formatCurrency(due)}
                  </td>
                  <td className="erp-lg-td">
                    <span className={`erp-reports-status is-${row.status === "cancelled" ? "cancelled" : "ok"}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

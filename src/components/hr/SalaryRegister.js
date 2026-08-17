"use client";

import React from "react";
import { Loader2, Printer, FileDown, Wallet } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default function SalaryRegister({
  rows = [],
  loading = false,
  onPrintSlip,
  onPdfSlip,
  pdfLoadingId = null,
}) {
  return (
    <div className="erp-accounts-grid-wrap">
      <div className="erp-accounts-grid-scroll">
        {loading ? (
          <div className="h-52 flex items-center justify-center">
            <Loader2 className="w-7 h-7 text-pink-500 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="erp-ac-empty py-16">
            <Wallet className="w-10 h-10 text-pink-200 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-600">No salary records for this period</p>
          </div>
        ) : (
          <table className="erp-ledger-grid erp-hr-grid">
            <colgroup>
              <col style={{ width: "2%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "8%" }} />
            </colgroup>
            <thead>
              <tr>
                <th className="erp-lg-th erp-hr-th erp-lg-th-num">#</th>
                <th className="erp-lg-th erp-hr-th">Employee</th>
                <th className="erp-lg-th erp-hr-th">Period</th>
                <th className="erp-lg-th erp-hr-th erp-lg-th-money">Base</th>
                <th className="erp-lg-th erp-hr-th erp-lg-th-money">Prev. adv.</th>
                <th className="erp-lg-th erp-hr-th erp-lg-th-money">Month adv.</th>
                <th className="erp-lg-th erp-hr-th erp-lg-th-money">Adv. deduct</th>
                <th className="erp-lg-th erp-hr-th erp-lg-th-money">Bonus</th>
                <th className="erp-lg-th erp-hr-th erp-lg-th-money">Deduct.</th>
                <th className="erp-lg-th erp-hr-th erp-lg-th-money">Net</th>
                <th className="erp-lg-th erp-hr-th erp-lg-th-money">Paid</th>
                <th className="erp-lg-th erp-hr-th erp-lg-th-money">Pending</th>
                <th className="erp-lg-th erp-hr-th erp-hr-th-center">Status</th>
                <th className="erp-lg-th erp-hr-th erp-hr-th-center">Slip</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const adv = row.advanceSummary || {};
                const pending = adv.pendingBalance ?? 0;
                return (
                <tr key={row.id} className="erp-lg-row erp-hr-row">
                  <td className="erp-lg-td erp-lg-td-num text-slate-400">{idx + 1}</td>
                  <td className="erp-lg-td">
                    <span className="font-semibold text-slate-900">{row.employee?.name || "—"}</span>
                    {row.employee?.department && (
                      <span className="block text-[10px] text-slate-500">{row.employee.department}</span>
                    )}
                    {row.paymentDate && (
                      <span className="block text-[10px] text-slate-400 mt-0.5">Paid {formatDate(row.paymentDate)}</span>
                    )}
                  </td>
                  <td className="erp-lg-td text-xs font-semibold text-slate-700">
                    {MONTHS[(row.month || 1) - 1]} {row.year}
                  </td>
                  <td className="erp-lg-td erp-lg-td-money">{formatCurrency(row.baseSalary)}</td>
                  <td className="erp-lg-td erp-lg-td-money text-amber-700">
                    {adv.previousBalance > 0 ? formatCurrency(adv.previousBalance) : "—"}
                  </td>
                  <td className="erp-lg-td erp-lg-td-money text-amber-700">
                    {adv.monthAdvanceTotal > 0 ? formatCurrency(adv.monthAdvanceTotal) : "—"}
                  </td>
                  <td className="erp-lg-td erp-lg-td-money text-orange-700">
                    {(row.advanceDeduction || adv.advanceDeduction) > 0
                      ? formatCurrency(row.advanceDeduction || adv.advanceDeduction)
                      : "—"}
                  </td>
                  <td className="erp-lg-td erp-lg-td-money text-emerald-700">{formatCurrency(row.bonus)}</td>
                  <td className="erp-lg-td erp-lg-td-money text-red-600">{formatCurrency(row.deductions)}</td>
                  <td className="erp-lg-td erp-lg-td-money font-bold text-pink-700">{formatCurrency(row.netSalary)}</td>
                  <td className="erp-lg-td erp-lg-td-money">{formatCurrency(row.paidAmount)}</td>
                  <td className={`erp-lg-td erp-lg-td-money font-semibold${pending > 0 ? " text-red-700" : " text-slate-400"}`}>
                    {pending > 0 ? formatCurrency(pending) : "—"}
                  </td>
                  <td className="erp-lg-td erp-hr-td-center">
                    <span className={`erp-hr-status-pill${row.status === "paid" ? " is-paid" : ""}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="erp-lg-td erp-hr-td-center">
                    <div className="erp-hr-slip-actions" onClick={(e) => e.stopPropagation()}>
                      <button type="button" className="erp-hr-slip-btn" onClick={() => onPrintSlip?.(row)} title="Print slip">
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        className="erp-hr-slip-btn erp-hr-slip-btn-primary"
                        onClick={() => onPdfSlip?.(row)}
                        disabled={pdfLoadingId === row.id}
                        title="Download PDF"
                      >
                        {pdfLoadingId === row.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

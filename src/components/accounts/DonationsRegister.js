"use client";

import React from "react";
import { Heart, Loader2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

export default function DonationsRegister({ donations = [], loading = false }) {
  const grandTotal = donations.reduce((sum, row) => sum + (row.amount || 0), 0);

  return (
    <>
      <div className="erp-accounts-grid-wrap erp-don-grid">
        <div className="erp-accounts-grid-scroll">
          {loading ? (
            <div className="h-52 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-rose-600 animate-spin" />
            </div>
          ) : donations.length === 0 ? (
            <div className="erp-don-empty">
              <div className="erp-don-empty-icon">
                <Heart className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700">No donations recorded yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Use <strong className="text-slate-700">New donation</strong> to record charitable giving from your cash account.
              </p>
            </div>
          ) : (
            <table className="erp-ledger-grid">
              <thead>
                <tr>
                  <th className="erp-lg-th erp-don-th w-10">#</th>
                  <th className="erp-lg-th erp-don-th">Donation #</th>
                  <th className="erp-lg-th erp-don-th">Date</th>
                  <th className="erp-lg-th erp-don-th">Purpose</th>
                  <th className="erp-lg-th erp-don-th">Beneficiary</th>
                  <th className="erp-lg-th erp-don-th">Cash account</th>
                  <th className="erp-lg-th erp-don-th erp-lg-th-money">Amount</th>
                  <th className="erp-lg-th erp-don-th">Recorded by</th>
                </tr>
              </thead>
              <tbody>
                {donations.map((row, idx) => (
                  <tr key={row.id} className="erp-lg-row hover:bg-rose-50/40">
                    <td className="erp-lg-td erp-lg-td-num text-xs text-slate-500">{idx + 1}</td>
                    <td className="erp-lg-td">
                      <span className="erp-don-doc-no">{row.donationNumber}</span>
                    </td>
                    <td className="erp-lg-td text-sm text-slate-600">{formatDate(row.donationDate)}</td>
                    <td className="erp-lg-td">
                      <span className="erp-don-purpose-badge">{row.purpose}</span>
                    </td>
                    <td className="erp-lg-td text-sm text-slate-600">{row.beneficiary || "—"}</td>
                    <td className="erp-lg-td">
                      <span className="erp-lg-account-name">{row.cashAccount?.name || "—"}</span>
                    </td>
                    <td className="erp-lg-td erp-lg-td-money font-bold text-slate-900">
                      {formatCurrency(row.amount || 0)}
                    </td>
                    <td className="erp-lg-td text-xs text-slate-600">{row.createdBy?.name || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {donations.length > 0 && (
        <div className="erp-ac-grid-footer erp-journal-footer bg-rose-50/60 border-t border-rose-100 text-slate-700">
          <span>
            <strong className="tabular-nums">{donations.length}</strong> donation{donations.length === 1 ? "" : "s"} · total{" "}
            <strong className="tabular-nums text-rose-800">{formatCurrency(grandTotal)}</strong>
          </span>
        </div>
      )}
    </>
  );
}

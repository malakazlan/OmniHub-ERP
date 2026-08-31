"use client";

import React from "react";
import Link from "next/link";
import { Store, Loader2, MapPin, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

export default function DealerShopsRegister({ shops = [], loading = false, summary = null }) {
  const grandOut = shops.reduce((sum, row) => sum + (row.totalOut || 0), 0);
  const grandIn = shops.reduce((sum, row) => sum + (row.totalIn || 0), 0);
  const grandPending = shops.reduce((sum, row) => sum + (row.receivable || 0), 0);

  return (
    <>
      <div className="erp-accounts-grid-wrap erp-dealer-grid">
        <div className="erp-accounts-grid-scroll">
          {loading ? (
            <div className="h-52 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-violet-600 animate-spin" />
            </div>
          ) : shops.length === 0 ? (
            <div className="erp-dealer-empty">
              <div className="erp-dealer-empty-icon">
                <Store className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700">No shops assigned yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Edit a shop and assign this dealer to see shop-wise in/out and pending here.
              </p>
            </div>
          ) : (
            <table className="erp-ledger-grid">
              <thead>
                <tr>
                  <th className="erp-lg-th erp-dealer-th w-10">#</th>
                  <th className="erp-lg-th erp-dealer-th">Shop</th>
                  <th className="erp-lg-th erp-dealer-th erp-lg-th-money">Sales out</th>
                  <th className="erp-lg-th erp-dealer-th erp-lg-th-money">Collections in</th>
                  <th className="erp-lg-th erp-dealer-th erp-lg-th-money">Ledger balance</th>
                  <th className="erp-lg-th erp-dealer-th erp-lg-th-money">Invoice pending</th>
                  <th className="erp-lg-th erp-dealer-th">Status</th>
                </tr>
              </thead>
              <tbody>
                {shops.map((row, idx) => (
                  <tr key={row.id} className="erp-lg-row hover:bg-violet-50/50">
                    <td className="erp-lg-td erp-lg-td-num text-xs text-slate-500">{idx + 1}</td>
                    <td className="erp-lg-td">
                      <Link href={`/shops/${row.id}`} className="erp-dealer-shop-link">
                        {row.name}
                      </Link>
                      {(row.area || row.city) && (
                        <p className="erp-dealer-shop-meta flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {[row.area, row.city].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </td>
                    <td className="erp-lg-td erp-lg-td-money">
                      <span className="erp-dealer-amt is-out">{formatCurrency(row.totalOut || 0)}</span>
                    </td>
                    <td className="erp-lg-td erp-lg-td-money">
                      <span className="erp-dealer-amt is-in">{formatCurrency(row.totalIn || 0)}</span>
                    </td>
                    <td className="erp-lg-td erp-lg-td-money">
                      <span className={`erp-dealer-amt ${row.balance > 0 ? "is-pending" : "is-neutral"}`}>
                        {formatCurrency(row.balance || 0)}
                      </span>
                    </td>
                    <td className="erp-lg-td erp-lg-td-money">
                      <span className="erp-dealer-amt is-invoice">{formatCurrency(row.invoicePending || 0)}</span>
                    </td>
                    <td className="erp-lg-td">
                      <span className={`erp-dealer-status ${row.isActive ? "is-active" : "is-inactive"}`}>
                        {row.isActive ? "Active" : "Suspended"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {shops.length > 0 && (
        <div className="erp-ac-grid-footer erp-dealer-footer">
          <span>
            <strong className="tabular-nums">{shops.length}</strong> shop{shops.length === 1 ? "" : "s"} · out{" "}
            <strong className="tabular-nums text-orange-700">{formatCurrency(summary?.totalOut ?? grandOut)}</strong>
            {" · "}in{" "}
            <strong className="tabular-nums text-emerald-700">{formatCurrency(summary?.totalIn ?? grandIn)}</strong>
            {" · "}pending{" "}
            <strong className="tabular-nums text-red-700">{formatCurrency(summary?.totalReceivable ?? grandPending)}</strong>
          </span>
        </div>
      )}
    </>
  );
}

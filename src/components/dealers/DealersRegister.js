"use client";

import React from "react";
import Link from "next/link";
import { Handshake, Loader2, MapPin } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

export default function DealersRegister({ dealers = [], loading = false, onRowClick }) {
  const totalPending = dealers.reduce((sum, row) => sum + (row.totalReceivable || 0), 0);

  return (
    <>
      <div className="erp-accounts-grid-wrap erp-dealer-grid">
        <div className="erp-accounts-grid-scroll">
          {loading ? (
            <div className="h-52 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-violet-600 animate-spin" />
            </div>
          ) : dealers.length === 0 ? (
            <div className="erp-dealer-empty">
              <div className="erp-dealer-empty-icon">
                <Handshake className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700">No dealers match your filters</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Register a dealer or clear filters to see the full list.
              </p>
            </div>
          ) : (
            <table className="erp-ledger-grid">
              <thead>
                <tr>
                  <th className="erp-lg-th erp-dealer-th w-10">#</th>
                  <th className="erp-lg-th erp-dealer-th">Dealer</th>
                  <th className="erp-lg-th erp-dealer-th">City</th>
                  <th className="erp-lg-th erp-dealer-th">Phone</th>
                  <th className="erp-lg-th erp-dealer-th">Shops</th>
                  <th className="erp-lg-th erp-dealer-th erp-lg-th-money">Pending</th>
                  <th className="erp-lg-th erp-dealer-th">Status</th>
                </tr>
              </thead>
              <tbody>
                {dealers.map((row, idx) => (
                  <tr
                    key={row.id}
                    className="erp-lg-row hover:bg-violet-50/50 cursor-pointer"
                    onClick={() => onRowClick?.(row)}
                  >
                    <td className="erp-lg-td erp-lg-td-num text-xs text-slate-500">{idx + 1}</td>
                    <td className="erp-lg-td">
                      <Link
                        href={`/dealers/${row.id}`}
                        className="erp-dealer-shop-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {row.name}
                      </Link>
                      {row.contactPerson && (
                        <p className="erp-dealer-shop-meta">{row.contactPerson}</p>
                      )}
                    </td>
                    <td className="erp-lg-td text-sm text-slate-600">
                      {row.city ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {row.city}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="erp-lg-td font-mono text-xs text-slate-600">{row.phone || "—"}</td>
                    <td className="erp-lg-td text-xs font-semibold text-slate-700">
                      {row.activeShops}/{row.shopCount} active
                    </td>
                    <td className="erp-lg-td erp-lg-td-money">
                      <span className={`erp-dealer-amt ${row.totalReceivable > 0 ? "is-pending" : "is-in"}`}>
                        {formatCurrency(row.totalReceivable || 0)}
                      </span>
                    </td>
                    <td className="erp-lg-td">
                      <span className={`erp-dealer-status ${row.isActive ? "is-active" : "is-inactive"}`}>
                        {row.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {dealers.length > 0 && (
        <div className="erp-ac-grid-footer erp-dealer-footer">
          <span>
            <strong className="tabular-nums">{dealers.length}</strong> dealer{dealers.length === 1 ? "" : "s"} · total pending{" "}
            <strong className="tabular-nums text-red-700">{formatCurrency(totalPending)}</strong>
          </span>
        </div>
      )}
    </>
  );
}

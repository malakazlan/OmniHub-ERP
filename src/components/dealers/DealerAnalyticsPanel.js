"use client";

import React from "react";
import Link from "next/link";
import {
  Loader2, ArrowUpRight, ArrowDownLeft, DollarSign, Store, TrendingUp, BarChart3,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

function CollectionBar({ rate }) {
  const width = Math.min(Math.max(rate, 0), 100);
  return (
    <div className="erp-dealer-rate-wrap">
      <div className="erp-dealer-rate-track">
        <div className="erp-dealer-rate-fill" style={{ width: `${width}%` }} />
      </div>
      <span className="erp-dealer-rate-text">{rate}%</span>
    </div>
  );
}

export default function DealerAnalyticsPanel({
  summary,
  dealers = [],
  topShops = [],
  loading = false,
  periodLabel = "All time",
}) {
  if (loading && !summary) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="erp-dealer-analytics-kpis">
        <div className="erp-dealer-analytics-kpi">
          <ArrowUpRight className="w-4 h-4 text-orange-500" />
          <div>
            <p className="erp-dealer-analytics-kpi-label">Total sales out</p>
            <p className="erp-dealer-analytics-kpi-value text-orange-700">{formatCurrency(summary?.totalOut || 0)}</p>
          </div>
        </div>
        <div className="erp-dealer-analytics-kpi">
          <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
          <div>
            <p className="erp-dealer-analytics-kpi-label">Total collections in</p>
            <p className="erp-dealer-analytics-kpi-value text-emerald-700">{formatCurrency(summary?.totalIn || 0)}</p>
          </div>
        </div>
        <div className="erp-dealer-analytics-kpi">
          <DollarSign className="w-4 h-4 text-red-500" />
          <div>
            <p className="erp-dealer-analytics-kpi-label">Total pending</p>
            <p className="erp-dealer-analytics-kpi-value text-red-600">{formatCurrency(summary?.totalReceivable || 0)}</p>
          </div>
        </div>
        <div className="erp-dealer-analytics-kpi">
          <TrendingUp className="w-4 h-4 text-violet-500" />
          <div>
            <p className="erp-dealer-analytics-kpi-label">Collection rate · {periodLabel}</p>
            <p className="erp-dealer-analytics-kpi-value text-violet-700">{summary?.collectionRate ?? 0}%</p>
          </div>
        </div>
      </div>

      <div className="erp-dealer-register">
        <div className="erp-dealer-register-head">
          <div>
            <p className="erp-dealer-register-title flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-violet-600" />
              Dealer performance
            </p>
            <p className="erp-dealer-register-meta">
              {dealers.length} dealer{dealers.length === 1 ? "" : "s"} · {summary?.shopCount || 0} shops · period: {periodLabel}
            </p>
          </div>
          {loading && <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />}
        </div>

        <div className="erp-accounts-grid-wrap erp-dealer-grid">
          <div className="erp-accounts-grid-scroll">
            {dealers.length === 0 ? (
              <div className="erp-dealer-empty py-16">
                <p className="text-sm font-semibold text-slate-700">No analytics for current filters</p>
              </div>
            ) : (
              <table className="erp-ledger-grid">
                <thead>
                  <tr>
                    <th className="erp-lg-th erp-dealer-th w-10">#</th>
                    <th className="erp-lg-th erp-dealer-th">Dealer</th>
                    <th className="erp-lg-th erp-dealer-th">Shops</th>
                    <th className="erp-lg-th erp-dealer-th erp-lg-th-money">Sales out</th>
                    <th className="erp-lg-th erp-dealer-th erp-lg-th-money">Collections in</th>
                    <th className="erp-lg-th erp-dealer-th erp-lg-th-money">Pending</th>
                    <th className="erp-lg-th erp-dealer-th">Collection</th>
                    <th className="erp-lg-th erp-dealer-th erp-lg-th-money">Invoice pending</th>
                  </tr>
                </thead>
                <tbody>
                  {dealers.map((row, idx) => (
                    <tr key={row.id} className="erp-lg-row hover:bg-violet-50/40">
                      <td className="erp-lg-td erp-lg-td-num text-xs text-slate-500">{idx + 1}</td>
                      <td className="erp-lg-td">
                        <Link href={`/dealers/${row.id}`} className="erp-dealer-shop-link">
                          {row.name}
                        </Link>
                        {row.city && <p className="erp-dealer-shop-meta">{row.city}</p>}
                      </td>
                      <td className="erp-lg-td text-xs font-semibold text-slate-700">
                        <span className="inline-flex items-center gap-1">
                          <Store className="w-3 h-3 text-violet-400" />
                          {row.shopCount}
                        </span>
                      </td>
                      <td className="erp-lg-td erp-lg-td-money">
                        <span className="erp-dealer-amt is-out">{formatCurrency(row.totalOut || 0)}</span>
                      </td>
                      <td className="erp-lg-td erp-lg-td-money">
                        <span className="erp-dealer-amt is-in">{formatCurrency(row.totalIn || 0)}</span>
                      </td>
                      <td className="erp-lg-td erp-lg-td-money">
                        <span className="erp-dealer-amt is-pending">{formatCurrency(row.totalReceivable || 0)}</span>
                      </td>
                      <td className="erp-lg-td">
                        <CollectionBar rate={row.collectionRate || 0} />
                      </td>
                      <td className="erp-lg-td erp-lg-td-money">
                        <span className="erp-dealer-amt is-invoice">{formatCurrency(row.invoicePending || 0)}</span>
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
              Totals · out <strong className="text-orange-700">{formatCurrency(summary?.totalOut || 0)}</strong>
              {" · "}in <strong className="text-emerald-700">{formatCurrency(summary?.totalIn || 0)}</strong>
              {" · "}pending <strong className="text-red-700">{formatCurrency(summary?.totalReceivable || 0)}</strong>
            </span>
          </div>
        )}
      </div>

      {topShops.length > 0 && (
        <div className="erp-dealer-register">
          <div className="erp-dealer-register-head">
            <div>
              <p className="erp-dealer-register-title">Top shops by pending</p>
              <p className="erp-dealer-register-meta">Highest receivable balances across filtered dealers</p>
            </div>
          </div>
          <div className="erp-accounts-grid-wrap erp-dealer-grid">
            <div className="erp-accounts-grid-scroll">
              <table className="erp-ledger-grid">
                <thead>
                  <tr>
                    <th className="erp-lg-th erp-dealer-th w-10">#</th>
                    <th className="erp-lg-th erp-dealer-th">Shop</th>
                    <th className="erp-lg-th erp-dealer-th">Dealer</th>
                    <th className="erp-lg-th erp-dealer-th erp-lg-th-money">Pending</th>
                    <th className="erp-lg-th erp-dealer-th erp-lg-th-money">Sales out</th>
                    <th className="erp-lg-th erp-dealer-th erp-lg-th-money">Collections in</th>
                  </tr>
                </thead>
                <tbody>
                  {topShops.map((row, idx) => (
                    <tr key={`${row.dealerId}-${row.id}`} className="erp-lg-row hover:bg-violet-50/40">
                      <td className="erp-lg-td erp-lg-td-num text-xs text-slate-500">{idx + 1}</td>
                      <td className="erp-lg-td">
                        <Link href={`/shops/${row.id}`} className="erp-dealer-shop-link">{row.name}</Link>
                      </td>
                      <td className="erp-lg-td text-xs text-slate-600">{row.dealerName}</td>
                      <td className="erp-lg-td erp-lg-td-money">
                        <span className="erp-dealer-amt is-pending">{formatCurrency(row.receivable || 0)}</span>
                      </td>
                      <td className="erp-lg-td erp-lg-td-money">
                        <span className="erp-dealer-amt is-out">{formatCurrency(row.totalOut || 0)}</span>
                      </td>
                      <td className="erp-lg-td erp-lg-td-money">
                        <span className="erp-dealer-amt is-in">{formatCurrency(row.totalIn || 0)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

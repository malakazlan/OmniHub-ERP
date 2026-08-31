"use client";

import React from "react";
import Link from "next/link";
import { Package, Loader2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

export default function PurchaseVendorItemsRegister({ items = [], loading = false }) {
  const totalQty = items.reduce((s, r) => s + (r.totalQuantity || 0), 0);
  const totalValue = items.reduce((s, r) => s + (r.totalAmount || 0), 0);

  return (
    <>
      <div className="erp-pv-grid-wrap">
        {loading ? (
          <div className="erp-pv-grid-loading">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="erp-pv-empty">
            <div className="erp-pv-empty-icon">
              <Package className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No items purchased yet</p>
            <p className="text-xs text-slate-500 mt-1">Confirmed purchase bills will appear here.</p>
          </div>
        ) : (
          <div className="erp-pv-grid-scroll">
            <table className="erp-pv-grid erp-pv-grid-items">
              <colgroup>
                <col className="col-num" />
                <col className="col-product" />
                <col className="col-sku" />
                <col className="col-num-sm" />
                <col className="col-num" />
                <col className="col-unit" />
                <col className="col-money" />
                <col className="col-money" />
                <col className="col-date" />
              </colgroup>
              <thead>
                <tr>
                  <th className="erp-pv-g-th col-num">#</th>
                  <th className="erp-pv-g-th col-product">Product</th>
                  <th className="erp-pv-g-th col-sku">SKU</th>
                  <th className="erp-pv-g-th col-num-sm">Times</th>
                  <th className="erp-pv-g-th col-num">Qty</th>
                  <th className="erp-pv-g-th col-unit">Unit</th>
                  <th className="erp-pv-g-th col-money">Avg rate</th>
                  <th className="erp-pv-g-th col-money">Total value</th>
                  <th className="erp-pv-g-th col-date">Last bought</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, idx) => (
                  <tr key={row.productId}>
                    <td className="erp-pv-g-td col-num">{idx + 1}</td>
                    <td className="erp-pv-g-td col-product">
                      <span className="erp-pv-g-product" title={row.productName}>
                        {row.productName}
                      </span>
                    </td>
                    <td className="erp-pv-g-td col-sku">{row.sku || "—"}</td>
                    <td className="erp-pv-g-td col-num-sm">{row.purchaseCount}</td>
                    <td className="erp-pv-g-td col-num is-qty">
                      {row.totalQuantity.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="erp-pv-g-td col-unit">{row.unit}</td>
                    <td className="erp-pv-g-td col-money">{formatCurrency(row.avgRate || 0)}</td>
                    <td className="erp-pv-g-td col-money is-total">
                      {formatCurrency(row.totalAmount || 0)}
                    </td>
                    <td className="erp-pv-g-td col-date">
                      {row.lastPurchaseDate ? formatDate(row.lastPurchaseDate) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="erp-pv-g-foot">
                  <td className="erp-pv-g-td" colSpan={4}>
                    <strong>{items.length}</strong> products
                  </td>
                  <td className="erp-pv-g-td col-num is-qty">
                    {totalQty.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </td>
                  <td className="erp-pv-g-td" colSpan={2} />
                  <td className="erp-pv-g-td col-money is-total">{formatCurrency(totalValue)}</td>
                  <td className="erp-pv-g-td" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

export function PurchaseVendorBillsRegister({ purchases = [], loading = false }) {
  if (loading) {
    return (
      <div className="erp-pv-grid-loading">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (purchases.length === 0) {
    return (
      <div className="erp-pv-empty py-16">
        <p className="text-sm font-semibold text-slate-700">No confirmed purchase bills</p>
      </div>
    );
  }

  const totalAmount = purchases.reduce((s, r) => s + (r.totalAmount || 0), 0);
  const totalDue = purchases.reduce(
    (s, r) => s + Math.max((r.totalAmount || 0) - (r.paidAmount || 0), 0),
    0
  );

  return (
    <div className="erp-pv-grid-wrap">
      <div className="erp-pv-grid-scroll">
        <table className="erp-pv-grid">
          <thead>
            <tr>
              <th className="erp-pv-g-th">Bill #</th>
              <th className="erp-pv-g-th col-date">Date</th>
              <th className="erp-pv-g-th col-num">Lines</th>
              <th className="erp-pv-g-th col-num">Quantity</th>
              <th className="erp-pv-g-th col-money">Bill total</th>
              <th className="erp-pv-g-th col-money">Paid</th>
              <th className="erp-pv-g-th col-money">Due</th>
              <th className="erp-pv-g-th col-unit">Status</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((row) => {
              const due = Math.max((row.totalAmount || 0) - (row.paidAmount || 0), 0);
              return (
                <tr key={row.id}>
                  <td className="erp-pv-g-td">
                    <Link href={`/purchases/${row.id}`} className="erp-pv-bill-no">
                      {row.purchaseNumber}
                    </Link>
                  </td>
                  <td className="erp-pv-g-td col-date">{formatDate(row.purchaseDate)}</td>
                  <td className="erp-pv-g-td col-num">{row.itemCount}</td>
                  <td className="erp-pv-g-td col-num">{row.totalQty}</td>
                  <td className="erp-pv-g-td col-money is-total">{formatCurrency(row.totalAmount)}</td>
                  <td className="erp-pv-g-td col-money erp-pv-g-paid">{formatCurrency(row.paidAmount)}</td>
                  <td className={`erp-pv-g-td col-money ${due > 0 ? "erp-pv-g-due" : "erp-pv-g-muted"}`}>
                    {formatCurrency(due)}
                  </td>
                  <td className="erp-pv-g-td col-unit">
                    <span className={`erp-pv-bill-status is-${row.status}`}>{row.status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="erp-pv-g-foot">
              <td className="erp-pv-g-td" colSpan={4}>
                <strong>{purchases.length}</strong> bill{purchases.length === 1 ? "" : "s"}
              </td>
              <td className="erp-pv-g-td col-money is-total">{formatCurrency(totalAmount)}</td>
              <td className="erp-pv-g-td" colSpan={2}>
                {totalDue > 0 && (
                  <span className="erp-pv-g-due">
                    Due {formatCurrency(totalDue)}
                  </span>
                )}
              </td>
              <td className="erp-pv-g-td" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

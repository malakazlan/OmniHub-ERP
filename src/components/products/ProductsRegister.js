"use client";

import React from "react";
import { Package, Loader2, AlertTriangle } from "lucide-react";
import { formatCurrency, formatQuantity } from "@/lib/formatters";

export default function ProductsRegister({
  rows = [],
  loading = false,
  mode = "catalog",
  onRowClick,
  footerLabel,
  footerValue,
}) {
  const isInventory = mode === "inventory";

  return (
    <>
      <div className="erp-accounts-grid-wrap">
        <div className="erp-accounts-grid-scroll">
          {loading ? (
            <div className="h-52 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-violet-500 animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <div className="erp-ledger-empty">
              <Package className="w-9 h-9 text-violet-200 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">No products found</p>
            </div>
          ) : (
            <table className="erp-ledger-grid erp-prod-grid">
              <colgroup>
                <col style={{ width: "2.5%" }} />
                <col style={{ width: isInventory ? "18%" : "20%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "9%" }} />
                {isInventory && <col style={{ width: "8%" }} />}
                <col style={{ width: "9%" }} />
                <col style={{ width: "9%" }} />
                {!isInventory && <col style={{ width: "7%" }} />}
                <col style={{ width: isInventory ? "10%" : "9%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="erp-lg-th erp-prod-th erp-lg-th-num">#</th>
                  <th className="erp-lg-th erp-prod-th">Product</th>
                  <th className="erp-lg-th erp-prod-th">SKU</th>
                  <th className="erp-lg-th erp-prod-th">Category</th>
                  <th className="erp-lg-th erp-prod-th erp-lg-th-money">Stock</th>
                  {isInventory && <th className="erp-lg-th erp-prod-th erp-lg-th-money">Min</th>}
                  <th className="erp-lg-th erp-prod-th erp-lg-th-money">Cost</th>
                  <th className="erp-lg-th erp-prod-th erp-lg-th-money">Sale price</th>
                  {!isInventory && <th className="erp-lg-th erp-prod-th erp-ac-th-center">Status</th>}
                  <th className="erp-lg-th erp-prod-th erp-lg-th-money">
                    {isInventory ? "Stock value" : "Value"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const isLow = row.isLow ?? row.currentStock <= row.minimumStock;
                  const stockValue = row.stockValue ?? (row.currentStock || 0) * (row.costPrice || 0);
                  return (
                    <tr
                      key={row.id}
                      className={`erp-lg-row${onRowClick ? " is-clickable erp-prod-row" : ""}`}
                      onClick={() => onRowClick?.(row)}
                    >
                      <td className="erp-lg-td erp-lg-td-num">{idx + 1}</td>
                      <td className="erp-lg-td erp-ac-td-name">
                        <span className="erp-lg-account-name">{row.name}</span>
                        {isLow && (
                          <span className="erp-prod-low-tag">
                            <AlertTriangle className="w-3 h-3" /> Low stock
                          </span>
                        )}
                      </td>
                      <td className="erp-lg-td erp-ac-td-code">{row.sku || "—"}</td>
                      <td className="erp-lg-td">
                        <span className="erp-prod-cat-pill">{row.category?.name || "—"}</span>
                      </td>
                      <td className={`erp-lg-td erp-lg-td-money ${isLow ? "erp-ac-balance-neg" : "erp-ac-balance-pos"}`}>
                        {formatQuantity(row.currentStock, row.unit)}
                      </td>
                      {isInventory && (
                        <td className="erp-lg-td erp-lg-td-money text-slate-600">
                          {formatQuantity(row.minimumStock, row.unit)}
                        </td>
                      )}
                      <td className="erp-lg-td erp-lg-td-money">{formatCurrency(row.costPrice)}</td>
                      <td className="erp-lg-td erp-lg-td-money">{formatCurrency(row.salePrice)}</td>
                      {!isInventory && (
                        <td className="erp-lg-td erp-ac-td-center">
                          <span className={`erp-ac-status ${row.isActive ? "is-active" : "is-inactive"}`}>
                            {row.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                      )}
                      <td className="erp-lg-td erp-lg-td-money erp-lg-balance">{formatCurrency(stockValue)}</td>
                    </tr>
                  );
                })}
              </tbody>
              {footerLabel && (
                <tfoot>
                  <tr className="erp-lg-foot erp-prod-foot">
                    <td colSpan={isInventory ? 8 : 8} className="erp-lg-td erp-lg-td-total-label">{footerLabel}</td>
                    <td className="erp-lg-td erp-lg-td-money erp-lg-balance">{footerValue}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </div>
      {!loading && rows.length > 0 && (
        <div className="erp-ac-grid-footer">
          <span>
            Showing <strong className="tabular-nums">{rows.length}</strong> products
            {onRowClick ? " · click a row for details" : ""}
          </span>
        </div>
      )}
    </>
  );
}

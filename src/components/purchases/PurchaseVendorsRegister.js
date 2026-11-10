"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, Loader2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

const TYPE_LABEL = { farmer: "Farmer (legacy)", company: "Vendor", other: "Vendor" };

export default function PurchaseVendorsRegister({ vendors = [], loading = false, onRowClick }) {
  const router = useRouter();
  const withPurchases = vendors.filter((v) => v.purchaseCount > 0).length;
  const totalLines = vendors.reduce((s, v) => s + v.lineItemCount, 0);
  const totalValue = vendors.reduce((s, v) => s + (v.totalAmount || 0), 0);

  const goToVendor = (row, href) => {
    if (onRowClick) onRowClick(row);
    else if (href) router.push(href);
  };

  return (
    <>
      <div className="erp-pv-grid-wrap">
        {loading ? (
          <div className="erp-pv-grid-loading">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        ) : vendors.length === 0 ? (
          <div className="erp-pv-empty">
            <div className="erp-pv-empty-icon">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No vendors yet</p>
            <p className="text-xs text-slate-500 mt-1">Register vendors in Chart of Accounts.</p>
          </div>
        ) : (
          <div className="erp-pv-grid-scroll">
            <table className="erp-pv-grid erp-pv-grid-vendors">
              <colgroup>
                <col className="col-num" />
                <col className="col-vendor" />
                <col className="col-type" />
                <col className="col-city" />
                <col className="col-num-sm" />
                <col className="col-num-sm" />
                <col className="col-num" />
                <col className="col-num-sm" />
                <col className="col-money-lg" />
                <col className="col-date" />
              </colgroup>
              <thead>
                <tr>
                  <th className="erp-pv-g-th col-num">#</th>
                  <th className="erp-pv-g-th col-vendor">Vendor account</th>
                  <th className="erp-pv-g-th col-type">Type</th>
                  <th className="erp-pv-g-th col-city">City</th>
                  <th className="erp-pv-g-th col-num-sm">Bills</th>
                  <th className="erp-pv-g-th col-num-sm">Lines</th>
                  <th className="erp-pv-g-th col-num">Qty</th>
                  <th className="erp-pv-g-th col-num-sm">Items</th>
                  <th className="erp-pv-g-th col-money-lg">Purchased value</th>
                  <th className="erp-pv-g-th col-date">Last purchase</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((row, idx) => {
                  const href =
                    row.type === "farmer" || row.type === "company"
                      ? `/purchases/vendors/${row.type}/${row.entityId}`
                      : null;
                  return (
                    <tr
                      key={row.key}
                      className={href ? "erp-pv-vendor-row is-clickable" : "erp-pv-vendor-row"}
                      onClick={() => href && goToVendor(row, href)}
                    >
                      <td className="erp-pv-g-td col-num">{idx + 1}</td>
                      <td className="erp-pv-g-td col-vendor">
                        {href ? (
                          <Link
                            href={href}
                            className="erp-pv-g-vendor-link"
                            title={row.name}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {row.name}
                          </Link>
                        ) : (
                          <span className="erp-pv-g-vendor-name" title={row.name}>
                            {row.name}
                          </span>
                        )}
                      </td>
                      <td className="erp-pv-g-td col-type">
                        <span className={`erp-pv-g-type is-${row.type}`}>
                          {TYPE_LABEL[row.type] || "Vendor"}
                        </span>
                      </td>
                      <td className="erp-pv-g-td col-city">{row.city || "—"}</td>
                      <td className="erp-pv-g-td col-num-sm">{row.purchaseCount}</td>
                      <td className="erp-pv-g-td col-num-sm">{row.lineItemCount}</td>
                      <td className="erp-pv-g-td col-num is-qty">
                        {row.totalQuantity.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td className="erp-pv-g-td col-num-sm">{row.uniqueProducts}</td>
                      <td className="erp-pv-g-td col-money-lg is-total">
                        {formatCurrency(row.totalAmount || 0)}
                      </td>
                      <td className="erp-pv-g-td col-date">
                        {row.lastPurchaseDate ? formatDate(row.lastPurchaseDate) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="erp-pv-g-foot">
                  <td className="erp-pv-g-td" colSpan={4}>
                    <strong>{withPurchases}</strong> with purchases ·{" "}
                    <strong>{totalLines}</strong> item lines
                  </td>
                  <td className="erp-pv-g-td" colSpan={4} />
                  <td className="erp-pv-g-td col-money-lg is-total">{formatCurrency(totalValue)}</td>
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

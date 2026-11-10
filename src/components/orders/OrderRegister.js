"use client";

import React from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { paymentStatusTone, orderStatusTone, statusLabel } from "@/lib/statusTone";
import { formatCurrency, formatDate } from "@/lib/formatters";

export default function OrderRegister({ rows, onOpenOrder }) {
  if (!rows.length) {
    return (
      <div className="erp-hub-register-empty">
        <p>No orders match your filters.</p>
        <p className="erp-hub-register-empty-hint">Try clearing filters or create a new order.</p>
      </div>
    );
  }

  const totalAmount = rows.reduce((s, r) => s + (r.totalAmount || 0), 0);

  return (
    <div className="erp-ledger-grid-wrap erp-orders-sheet-wrap">
      <div className="erp-ledger-grid-scroll erp-orders-sheet-scroll">
        <table className="erp-ledger-grid erp-orders-sheet">
          <thead>
            <tr>
              <th className="erp-lg-th erp-lg-th-num">#</th>
              <th className="erp-lg-th">Order #</th>
              <th className="erp-lg-th erp-lg-th-wide">Customer</th>
              <th className="erp-lg-th erp-lg-th-date">Date</th>
              <th className="erp-lg-th erp-lg-th-money">Total</th>
              <th className="erp-lg-th">Status</th>
              <th className="erp-lg-th">Created by</th>
              <th className="erp-lg-th erp-orders-sheet-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const customer = row.shop?.name || row.company?.name || row.customerName || "—";
              return (
                <tr
                  key={row.id}
                  className="erp-lg-row erp-orders-sheet-row is-clickable"
                  onClick={() => onOpenOrder?.(row.id)}
                >
                  <td className="erp-lg-td erp-lg-td-num">{index + 1}</td>
                  <td className="erp-lg-td erp-orders-sheet-no">{row.orderNumber || "—"}</td>
                  <td className="erp-lg-td erp-lg-td-account">
                    <span className="erp-lg-account-name">{customer}</span>
                  </td>
                  <td className="erp-lg-td erp-lg-td-date">{formatDate(row.orderDate)}</td>
                  <td className="erp-lg-td erp-lg-td-money">{formatCurrency(row.totalAmount)}</td>
                  <td className="erp-lg-td erp-orders-sheet-status"><Badge variant={orderStatusTone(row.status || "pending")}>{statusLabel(row.status || "pending")}</Badge></td>
                  <td className="erp-lg-td">{row.createdBy?.name || "—"}</td>
                  <td className="erp-lg-td erp-orders-sheet-actions" onClick={(e) => e.stopPropagation()}>
                    <Link href={`/orders/${row.id}`} className="erp-orders-sheet-action" title="Open order">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="erp-lg-foot erp-orders-sheet-foot">
              <td className="erp-lg-td erp-lg-td-total-label" colSpan={4}>
                Total ({rows.length} rows)
              </td>
              <td className="erp-lg-td erp-lg-td-money">{formatCurrency(totalAmount)}</td>
              <td className="erp-lg-td" colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

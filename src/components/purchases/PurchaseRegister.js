"use client";

import React from "react";
import Link from "next/link";
import { FileText, ExternalLink, Pencil, Wallet } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

function balanceDue(row) {
  return Math.max((row.totalAmount || 0) - (row.paidAmount || 0), 0);
}

function vendorTypeLabel(row) {
  if (row.farmerId) return "Farmer (legacy)";
  if (row.companyId) return "Vendor";
  return "—";
}

export default function PurchaseRegister({ rows, onOpenBill, onPay }) {
  if (!rows.length) {
    return (
      <div className="erp-hub-register-empty">
        <p>No purchases match your filters.</p>
        <p className="erp-hub-register-empty-hint">Try clearing filters or create a new purchase.</p>
      </div>
    );
  }

  const totals = rows.reduce(
    (acc, row) => {
      acc.total += row.totalAmount || 0;
      acc.paid += row.paidAmount || 0;
      acc.due += balanceDue(row);
      return acc;
    },
    { total: 0, paid: 0, due: 0 }
  );

  return (
    <div className="erp-ledger-grid-wrap erp-purchases-sheet-wrap">
      <div className="erp-ledger-grid-scroll erp-purchases-sheet-scroll">
        <table className="erp-ledger-grid erp-purchases-sheet">
          <thead>
            <tr>
              <th className="erp-lg-th erp-lg-th-num">#</th>
              <th className="erp-lg-th">PO number</th>
              <th className="erp-lg-th erp-lg-th-wide">Vendor</th>
              <th className="erp-lg-th">Type</th>
              <th className="erp-lg-th erp-lg-th-date">Date</th>
              <th className="erp-lg-th erp-lg-th-money">Total</th>
              <th className="erp-lg-th erp-lg-th-money">Paid</th>
              <th className="erp-lg-th erp-lg-th-money">Due</th>
              <th className="erp-lg-th">Order</th>
              <th className="erp-lg-th">Payment</th>
              <th className="erp-lg-th erp-purchases-sheet-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const due = balanceDue(row);
              const canPay = row.status !== "draft" && row.status !== "cancelled" && due > 0;
              const canBill = row.status !== "draft" && row.status !== "cancelled";

              return (
                <tr
                  key={row.id}
                  className={`erp-lg-row erp-purchases-sheet-row${canBill ? " is-clickable" : ""}`}
                  onClick={() => {
                    if (row.status === "draft") return;
                    if (canBill) onOpenBill?.(row.id);
                  }}
                >
                  <td className="erp-lg-td erp-lg-td-num">{index + 1}</td>
                  <td className="erp-lg-td erp-purchases-sheet-po">{row.purchaseNumber || "—"}</td>
                  <td className="erp-lg-td erp-lg-td-account">
                    <span className="erp-lg-account-name">{row.vendorName || "—"}</span>
                  </td>
                  <td className="erp-lg-td">{vendorTypeLabel(row)}</td>
                  <td className="erp-lg-td erp-lg-td-date">{formatDate(row.purchaseDate)}</td>
                  <td className="erp-lg-td erp-lg-td-money">{formatCurrency(row.totalAmount)}</td>
                  <td className="erp-lg-td erp-lg-td-money erp-purchases-sheet-paid">
                    {formatCurrency(row.paidAmount || 0)}
                  </td>
                  <td className={`erp-lg-td erp-lg-td-money${due > 0 ? " erp-purchases-sheet-due" : ""}`}>
                    {formatCurrency(due)}
                  </td>
                  <td className="erp-lg-td erp-purchases-sheet-status">{(row.status || "draft").replace(/_/g, " ")}</td>
                  <td className="erp-lg-td erp-purchases-sheet-status">{row.paymentStatus || "unpaid"}</td>
                  <td className="erp-lg-td erp-purchases-sheet-actions" onClick={(e) => e.stopPropagation()}>
                    <div className="erp-purchases-sheet-action-btns">
                      {row.status === "draft" && (
                        <Link href={`/purchases/new?edit=${row.id}`} className="erp-purchases-sheet-action is-edit" title="Edit draft">
                          <Pencil className="w-3.5 h-3.5" />
                        </Link>
                      )}
                      {canPay && (
                        <button type="button" className="erp-purchases-sheet-action is-pay" title="Pay balance" onClick={() => onPay?.(row)}>
                          <Wallet className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canBill && (
                        <button type="button" className="erp-purchases-sheet-action is-bill" title="View bill" onClick={() => onOpenBill?.(row.id)}>
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <Link href={`/purchases/${row.id}`} className="erp-purchases-sheet-action is-open" title="Open purchase">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="erp-lg-foot erp-purchases-sheet-foot">
              <td className="erp-lg-td erp-lg-td-total-label" colSpan={5}>
                Total ({rows.length} rows)
              </td>
              <td className="erp-lg-td erp-lg-td-money">{formatCurrency(totals.total)}</td>
              <td className="erp-lg-td erp-lg-td-money">{formatCurrency(totals.paid)}</td>
              <td className="erp-lg-td erp-lg-td-money erp-purchases-sheet-due">{formatCurrency(totals.due)}</td>
              <td className="erp-lg-td" colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { FileText, ExternalLink } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { saleCustomerTypeLabel } from "@/lib/saleCustomer";

function balanceDue(row) {
  return Math.max((row.totalAmount || 0) - (row.paidAmount || 0), 0);
}

export default function SalesRegister({ rows, onOpenInvoice }) {
  if (!rows.length) {
    return (
      <div className="erp-sales-register-empty">
        <p>No sales match your filters.</p>
        <p className="erp-sales-register-empty-hint">Try clearing filters or create a new sale.</p>
      </div>
    );
  }

  const totals = rows.reduce(
    (acc, row) => {
      acc.total += row.totalAmount || 0;
      acc.received += row.paidAmount || 0;
      acc.due += balanceDue(row);
      return acc;
    },
    { total: 0, received: 0, due: 0 }
  );

  return (
    <div className="erp-ledger-grid-wrap erp-sales-sheet-wrap">
      <div className="erp-ledger-grid-scroll erp-sales-sheet-scroll">
        <table className="erp-ledger-grid erp-sales-sheet">
          <thead>
            <tr>
              <th className="erp-lg-th erp-lg-th-num">#</th>
              <th className="erp-lg-th">Invoice</th>
              <th className="erp-lg-th erp-lg-th-wide">Customer</th>
              <th className="erp-lg-th">Type</th>
              <th className="erp-lg-th erp-lg-th-date">Date</th>
              <th className="erp-lg-th erp-lg-th-money">Total</th>
              <th className="erp-lg-th erp-lg-th-money">Received</th>
              <th className="erp-lg-th erp-lg-th-money">Due</th>
              <th className="erp-lg-th">Payment</th>
              <th className="erp-lg-th">Status</th>
              <th className="erp-lg-th erp-sales-sheet-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const due = balanceDue(row);
              const canInvoice = row.status !== "draft" && row.status !== "cancelled";

              return (
                <tr
                  key={row.id}
                  className={`erp-lg-row erp-sales-sheet-row${canInvoice ? " is-clickable" : ""}`}
                  onClick={() => canInvoice && onOpenInvoice?.(row.id)}
                >
                  <td className="erp-lg-td erp-lg-td-num">{index + 1}</td>
                  <td className="erp-lg-td erp-sales-sheet-inv">{row.invoiceNumber || "—"}</td>
                  <td className="erp-lg-td erp-lg-td-account">
                    <span className="erp-lg-account-name">{row.customerName || "—"}</span>
                  </td>
                  <td className="erp-lg-td">{saleCustomerTypeLabel(row)}</td>
                  <td className="erp-lg-td erp-lg-td-date">{formatDate(row.saleDate)}</td>
                  <td className="erp-lg-td erp-lg-td-money">{formatCurrency(row.totalAmount)}</td>
                  <td className="erp-lg-td erp-lg-td-money erp-sales-sheet-received">
                    {formatCurrency(row.paidAmount || 0)}
                  </td>
                  <td className={`erp-lg-td erp-lg-td-money${due > 0 ? " erp-sales-sheet-due" : ""}`}>
                    {formatCurrency(due)}
                  </td>
                  <td className="erp-lg-td erp-sales-sheet-status">{row.paymentStatus || "unpaid"}</td>
                  <td className="erp-lg-td erp-sales-sheet-status">{(row.status || "draft").replace(/_/g, " ")}</td>
                  <td className="erp-lg-td erp-sales-sheet-actions" onClick={(e) => e.stopPropagation()}>
                    <div className="erp-sales-sheet-action-btns">
                      {canInvoice && (
                        <button
                          type="button"
                          className="erp-sales-sheet-action"
                          title="View invoice"
                          onClick={() => onOpenInvoice?.(row.id)}
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <Link href={`/sales/${row.id}`} className="erp-sales-sheet-action" title="Open sale">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="erp-lg-foot erp-sales-sheet-foot">
              <td className="erp-lg-td erp-lg-td-total-label" colSpan={5}>
                Total ({rows.length} rows)
              </td>
              <td className="erp-lg-td erp-lg-td-money">{formatCurrency(totals.total)}</td>
              <td className="erp-lg-td erp-lg-td-money">{formatCurrency(totals.received)}</td>
              <td className="erp-lg-td erp-lg-td-money erp-sales-sheet-due">{formatCurrency(totals.due)}</td>
              <td className="erp-lg-td" colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { formatCurrency } from "@/lib/formatters";
import { ledgerEntryOpensInvoice } from "@/lib/ledgerDisplay";
import { formatLedgerParticularsText } from "@/lib/ledgerParticulars";
import { FileText, ShoppingCart, Receipt, Undo2 } from "lucide-react";

export function LedgerEntryParticulars({ entry, onOpenDocument }) {
  const canOpen = ledgerEntryOpensInvoice(entry) && onOpenDocument;
  const hasItems = Array.isArray(entry.lineItems) && entry.lineItems.length > 0;

  const handleClick = (e) => {
    if (!canOpen) return;
    e.stopPropagation();
    onOpenDocument(entry);
  };

  const Icon =
    entry.documentType === "purchase" || entry.referenceType === "PurchaseOrder"
      ? ShoppingCart
      : entry.documentType === "sale_return" || entry.referenceType === "SaleReturn"
        ? Undo2
      : entry.documentType === "sale" || entry.referenceType === "SaleOrder"
        ? Receipt
        : FileText;

  const typeClass =
    entry.referenceType === "PurchaseOrder"
      ? "erp-lg-doc-purchase"
      : entry.referenceType === "SaleOrder"
        ? "erp-lg-doc-sale"
        : entry.referenceType === "SaleReturn"
          ? "erp-lg-doc-return"
        : entry.referenceType === "Payment"
          ? "erp-lg-doc-payment"
          : "erp-lg-doc-journal";

  return (
    <div
      className={`erp-lg-particulars${canOpen ? " erp-lg-particulars-clickable" : ""}`}
      onClick={handleClick}
      role={canOpen ? "button" : undefined}
      tabIndex={canOpen ? 0 : undefined}
      title={canOpen ? "Click to open bill / invoice / return receipt" : undefined}
    >
      <div className="erp-lg-particulars-head">
        <span className={`erp-lg-doc-tag ${typeClass}`}>
          <Icon className="w-3 h-3" />
        </span>
        <div className="erp-lg-particulars-text min-w-0">
          <p className="erp-lg-particulars-title">
            {entry.description}
            {entry.reference ? (
              <span className="erp-lg-particulars-ref"> · {entry.reference}</span>
            ) : null}
          </p>
        </div>
      </div>

      {hasItems && (
        <div className="erp-lg-items-grid-wrap" onClick={(e) => e.stopPropagation()}>
          <table className="erp-lg-items-grid">
            <colgroup>
              <col className="col-item" />
              <col className="col-qty" />
              <col className="col-rate" />
              <col className="col-total" />
            </colgroup>
            <thead>
              <tr>
                <th>Item</th>
                <th className="num">Qty</th>
                <th className="num">Rate</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {entry.lineItems.map((item, idx) => (
                <tr key={idx}>
                  <td className="item-name" title={item.name}>
                    {item.name}
                  </td>
                  <td className="num">
                    {item.quantity}
                    {item.unit ? ` ${item.unit}` : ""}
                  </td>
                  <td className="num">{formatCurrency(item.rate, false)}</td>
                  <td className="num total">{formatCurrency(item.amount, false)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="erp-lg-particulars-print-only">{formatLedgerParticularsText(entry)}</p>
    </div>
  );
}

"use client";

import React from "react";
import { formatCurrency } from "@/lib/formatters";

function money(n) {
  return formatCurrency(n, false);
}

export function LedgerPrintParticulars({ entry }) {
  const hasItems = Array.isArray(entry.lineItems) && entry.lineItems.length > 0;

  return (
    <div className="erp-lg-print-particulars">
      <p className="erp-lg-print-particulars-title">
        {entry.description}
        {entry.reference ? (
          <span className="erp-lg-print-particulars-ref"> · {entry.reference}</span>
        ) : null}
      </p>
      {hasItems && (
        <table className="erp-lg-print-items-grid">
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
                <td>{item.name}</td>
                <td className="num">
                  {item.quantity}
                  {item.unit ? ` ${item.unit}` : ""}
                </td>
                <td className="num">{money(item.rate)}</td>
                <td className="num">{money(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

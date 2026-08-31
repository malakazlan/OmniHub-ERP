"use client";

import React from "react";
import { DEFAULT_COMPANY } from "@/components/documents/DocumentBillShell";
import {
  saleCustomerDisplayName,
  saleCustomerTypeLabel,
  saleCustomerPhone,
} from "@/lib/saleCustomer";
import { formatCurrency, formatDate, formatQuantity } from "@/lib/formatters";
import { amountInWords } from "@/lib/amountInWords";

function moneyPlain(val) {
  return formatCurrency(val ?? 0, false);
}

export default function SaleReturnReceipt({ saleReturn, sale, company = DEFAULT_COMPANY }) {
  if (!saleReturn) return null;

  const c = { ...DEFAULT_COMPANY, ...company };
  const items = saleReturn.items || [];
  const customerPhone = sale ? saleCustomerPhone(sale) : null;

  return (
    <article className="erp-sale-invoice erp-sale-return">
      <header className="erp-inv-header erp-return-header">
        <div className="erp-inv-header-inner">
          <div className="erp-inv-brand">
            <h1 className="erp-inv-company-name">{c.company_name}</h1>
            {c.tagline && <p className="erp-inv-company-tag">{c.tagline}</p>}
          </div>
          <div className="erp-inv-doc-meta">
            <p className="erp-inv-doc-kicker">Sale return receipt</p>
            <p className="erp-inv-doc-no">{saleReturn.returnNumber || "—"}</p>
            <p className="erp-inv-doc-date">
              {saleReturn.returnDate ? formatDate(saleReturn.returnDate) : "—"}
            </p>
            <span className="erp-return-badge">RETURN</span>
          </div>
        </div>
      </header>

      <section className="erp-inv-customer">
        <div className="erp-inv-customer-grid">
          <div className="erp-inv-customer-cell">
            <span className="erp-inv-cell-label">Customer</span>
            <span className="erp-inv-cell-value is-name">
              {sale ? saleCustomerDisplayName(sale) : "—"}
            </span>
          </div>
          <div className="erp-inv-customer-cell">
            <span className="erp-inv-cell-label">Customer type</span>
            <span className="erp-inv-cell-value">{sale ? saleCustomerTypeLabel(sale) : "—"}</span>
          </div>
          <div className="erp-inv-customer-cell">
            <span className="erp-inv-cell-label">Phone</span>
            <span className="erp-inv-cell-value">{customerPhone || "—"}</span>
          </div>
          <div className="erp-inv-customer-cell">
            <span className="erp-inv-cell-label">Original invoice</span>
            <span className="erp-inv-cell-value font-mono">{sale?.invoiceNumber || "—"}</span>
          </div>
        </div>
      </section>

      {saleReturn.reason && (
        <div className="erp-return-reason">
          <strong>Reason:</strong> {saleReturn.reason}
        </div>
      )}

      <div className="erp-inv-table-wrap">
        <table className="erp-inv-table">
          <thead>
            <tr>
              <th className="w-10">#</th>
              <th>Description</th>
              <th className="text-right w-24">Qty</th>
              <th className="text-right w-24">Rate</th>
              <th className="text-right w-28">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i}>
                <td className="text-center text-muted">{i + 1}</td>
                <td className="font-medium">{item.productName}</td>
                <td className="text-right tabular-nums">{formatQuantity(item.quantity, item.unit)}</td>
                <td className="text-right font-mono tabular-nums">{moneyPlain(item.rate)}</td>
                <td className="text-right font-mono font-semibold tabular-nums text-red-700">
                  {moneyPlain(item.amount || item.quantity * item.rate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="erp-inv-bottom">
        <div className="erp-inv-words">
          <p className="erp-inv-words-label">Return amount in words</p>
          <p className="erp-inv-words-text">{amountInWords(saleReturn.returnAmount)}</p>
        </div>
        <div className="erp-inv-payment">
          <p className="erp-inv-payment-title">Return summary</p>
          <div className="erp-inv-pay-grid">
            <div className="erp-inv-pay-head">Particulars</div>
            <div className="erp-inv-pay-head is-amt">Amount (Rs.)</div>
            <div className="erp-inv-pay-label is-grand">Total returned</div>
            <div className="erp-inv-pay-value is-grand erp-return-total">
              {moneyPlain(saleReturn.returnAmount)}
            </div>
          </div>
        </div>
      </div>

      {saleReturn.notes && (
        <div className="erp-inv-notes">
          <strong>Note:</strong> {saleReturn.notes}
        </div>
      )}

      <footer className="erp-inv-signature">
        <div>
          <div className="erp-inv-sig-line" />
          <p className="erp-inv-sig-role">Authorized signatory</p>
        </div>
      </footer>

      <p className="erp-inv-footnote">
        {c.company_name} · Sale return credit note
      </p>
    </article>
  );
}

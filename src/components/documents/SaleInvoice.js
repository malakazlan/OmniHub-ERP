"use client";

import React from "react";
import { DEFAULT_COMPANY } from "@/components/documents/DocumentBillShell";
import {
  saleCustomerDisplayName,
  saleCustomerTypeLabel,
  saleCustomerPhone,
} from "@/lib/saleCustomer";
import { resolveSalePayment, salePaymentStatusLabel } from "@/lib/salePayment";
import { computeCustomerBalancesForSale } from "@/lib/saleBalances";
import { formatCurrency, formatDate, formatQuantity } from "@/lib/formatters";
import { amountInWords } from "@/lib/amountInWords";

function moneyPlain(val) {
  return formatCurrency(val ?? 0, false);
}

function PaymentBadge({ status }) {
  return (
    <span className={`erp-inv-pay-badge is-${status}`}>
      {salePaymentStatusLabel(status).toUpperCase()}
    </span>
  );
}

export default function SaleInvoice({ sale, company = DEFAULT_COMPANY }) {
  if (!sale) return null;

  const c = { ...DEFAULT_COMPANY, ...company };
  const items = sale.items || [];
  const payment = resolveSalePayment(sale);
  const customerPhone = saleCustomerPhone(sale);
  const hasLedger = Boolean(sale.customerAccountId);

  const customerBal = sale.customerAccountBalance ?? 0;
  const balances = computeCustomerBalancesForSale(sale, customerBal);
  const previousBalance = sale.previousBalance ?? balances.previousBalance;
  const totalOutstanding = sale.totalOutstanding ?? sale.currentBalance ?? balances.totalOutstanding;

  const extraCosts = [
    ["Transport", sale.transportCost],
    ["Loading", sale.loadingCost],
    ["Tax / GST", sale.taxAmount],
  ].filter(([, v]) => parseFloat(v) > 0);

  const discount = parseFloat(sale.discountAmount) > 0 ? sale.discountAmount : null;

  return (
    <article className="erp-sale-invoice">
      <header className="erp-inv-header">
        <div className="erp-inv-header-inner">
          <div className="erp-inv-brand">
            <h1 className="erp-inv-company-name">{c.company_name}</h1>
            {c.tagline && <p className="erp-inv-company-tag">{c.tagline}</p>}
            <div className="erp-inv-company-meta">
              {[c.company_address, c.company_phone, c.company_email, c.ntn && `NTN ${c.ntn}`, c.strn && `STRN ${c.strn}`]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>

          <div className="erp-inv-doc-meta">
            <p className="erp-inv-doc-kicker">Tax Invoice</p>
            <p className="erp-inv-doc-no">{sale.invoiceNumber || "—"}</p>
            <p className="erp-inv-doc-date">{sale.saleDate ? formatDate(sale.saleDate) : "—"}</p>
            <PaymentBadge status={payment.paymentStatus} />
          </div>
        </div>
      </header>

      <section className="erp-inv-customer">
        <div className="erp-inv-customer-grid">
          <div className="erp-inv-customer-cell">
            <span className="erp-inv-cell-label">Bill to</span>
            <span className="erp-inv-cell-value is-name">{saleCustomerDisplayName(sale)}</span>
          </div>
          <div className="erp-inv-customer-cell">
            <span className="erp-inv-cell-label">Customer type</span>
            <span className="erp-inv-cell-value">{saleCustomerTypeLabel(sale)}</span>
          </div>
          <div className="erp-inv-customer-cell">
            <span className="erp-inv-cell-label">Phone</span>
            <span className="erp-inv-cell-value">{customerPhone || "—"}</span>
          </div>
          <div className="erp-inv-customer-cell">
            <span className="erp-inv-cell-label">Order status</span>
            <span className="erp-inv-cell-value is-cap">{(sale.status || "draft").replace(/_/g, " ")}</span>
          </div>
        </div>
        {hasLedger && (
          <div className="erp-inv-customer-balance">
            <span className="erp-inv-customer-balance-label">Previous balance</span>
            <span className="erp-inv-customer-balance-value">{formatCurrency(previousBalance)}</span>
          </div>
        )}
      </section>

      {(sale.vehicleNumber || sale.driverName) && (
        <section className="erp-inv-dispatch">
          {sale.vehicleNumber && (
            <span><strong>Vehicle</strong> {sale.vehicleNumber}</span>
          )}
          {sale.driverName && (
            <span><strong>Driver</strong> {sale.driverName}</span>
          )}
        </section>
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
              <tr key={item.id || i}>
                <td className="text-center text-muted">{i + 1}</td>
                <td className="font-medium">{item.productName}</td>
                <td className="text-right tabular-nums">{formatQuantity(item.quantity, item.unit)}</td>
                <td className="text-right font-mono tabular-nums">{moneyPlain(item.rate)}</td>
                <td className="text-right font-mono font-semibold tabular-nums">{moneyPlain(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="erp-inv-bottom">
        <div className="erp-inv-words">
          <p className="erp-inv-words-label">Amount in words</p>
          <p className="erp-inv-words-text">{amountInWords(payment.totalAmount)}</p>
          {(payment.cashAmount > 0 || payment.bankAmount > 0) && (
            <p className="erp-inv-pay-method">
              {payment.cashAmount > 0 && `Cash ${moneyPlain(payment.cashAmount)}`}
              {payment.cashAmount > 0 && payment.bankAmount > 0 && " · "}
              {payment.bankAmount > 0 && `Bank ${moneyPlain(payment.bankAmount)}`}
            </p>
          )}
        </div>

        <div className="erp-inv-payment">
          <p className="erp-inv-payment-title">Payment summary</p>
          <div className="erp-inv-pay-grid">
            <div className="erp-inv-pay-head">Particulars</div>
            <div className="erp-inv-pay-head is-amt">Amount (Rs.)</div>

            {hasLedger && (
              <>
                <div className="erp-inv-pay-label is-balance">Previous balance</div>
                <div className="erp-inv-pay-value is-balance">{formatCurrency(previousBalance)}</div>
              </>
            )}

            <div className="erp-inv-pay-label">Subtotal</div>
            <div className="erp-inv-pay-value">{moneyPlain(sale.subtotal)}</div>

            {extraCosts.map(([label, val]) => (
              <React.Fragment key={label}>
                <div className="erp-inv-pay-label">{label}</div>
                <div className="erp-inv-pay-value">{moneyPlain(val)}</div>
              </React.Fragment>
            ))}

            {discount != null && (
              <>
                <div className="erp-inv-pay-label">Discount</div>
                <div className="erp-inv-pay-value is-discount">− {moneyPlain(discount)}</div>
              </>
            )}

            <div className="erp-inv-pay-label is-grand">Invoice total</div>
            <div className="erp-inv-pay-value is-grand">{moneyPlain(payment.totalAmount)}</div>

            <div className="erp-inv-pay-label">Amount received</div>
            <div className="erp-inv-pay-value">{moneyPlain(payment.paidAmount)}</div>

            <div className={`erp-inv-pay-label ${payment.balanceDue > 0 ? "is-due" : "is-settled"}`}>
              Balance due (this invoice)
            </div>
            <div className={`erp-inv-pay-value ${payment.balanceDue > 0 ? "is-due" : "is-settled"}`}>
              {moneyPlain(payment.balanceDue)}
            </div>

            {hasLedger && (
              <>
                <div className="erp-inv-pay-label is-outstanding">Total outstanding</div>
                <div className="erp-inv-pay-value is-outstanding">{formatCurrency(totalOutstanding)}</div>
              </>
            )}
          </div>
        </div>
      </div>

      {sale.notes && (
        <div className="erp-inv-notes">
          <strong>Note:</strong> {sale.notes}
        </div>
      )}

      <footer className="erp-inv-signature">
        <div>
          <div className="erp-inv-sig-line" />
          <p className="erp-inv-sig-role">Authorized signatory</p>
        </div>
      </footer>

      <p className="erp-inv-footnote">
        {c.company_name} · Computer-generated invoice
      </p>
    </article>
  );
}

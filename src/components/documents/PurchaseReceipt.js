"use client";

import React from "react";
import { DEFAULT_COMPANY } from "@/components/documents/DocumentBillShell";
import { formatCurrency, formatDate, formatQuantity } from "@/lib/formatters";
import { computeVendorBalancesForPurchase } from "@/lib/purchaseBalances";
import { companyAddressLine } from "@/lib/companyProfile";

function moneyPlain(val) {
  return formatCurrency(val ?? 0, false);
}

function positiveAmount(val) {
  const n = parseFloat(val);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function partyMeta(purchase) {
  const phone =
    purchase.farmer?.phone ||
    purchase.farmer?.whatsappNumber ||
    purchase.company?.phone ||
    purchase.company?.whatsappNumber ||
    "";
  const city = purchase.farmer?.city || purchase.company?.city || "—";
  return { phone: phone || "—", city };
}

function vendorTypeLabel(purchase) {
  if (purchase.farmerId) return "Farmer (legacy)";
  if (purchase.companyId) return "Vendor";
  return "Vendor";
}

function PaymentBadge({ status }) {
  const s = status || "unpaid";
  return (
    <span className={`erp-pi-pay-badge is-${s}`}>
      {s.toUpperCase()}
    </span>
  );
}

/**
 * Professional vendor bill — print, PDF, and WhatsApp capture.
 */
export default function PurchaseReceipt({ purchase, company = DEFAULT_COMPANY }) {
  if (!purchase) return null;

  const c = { ...DEFAULT_COMPANY, ...company };
  const items = purchase.items || [];
  const { phone, city } = partyMeta(purchase);

  const balanceDue = Math.max((purchase.totalAmount || 0) - (purchase.paidAmount || 0), 0);
  const vendorBal = purchase.vendorAccountBalance ?? 0;
  const previousBalance =
    purchase.previousBalance ??
    computeVendorBalancesForPurchase(purchase, vendorBal).previousBalance;
  const currentBalance =
    purchase.currentBalance ??
    computeVendorBalancesForPurchase(purchase, vendorBal).currentBalance;

  const materialQty = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);

  const serviceCharges = [
    ["Transport", purchase.transportCost],
    ["Loading", purchase.loadingCost],
    ["Labour", purchase.labourCost],
    ["Tax / GST", purchase.taxAmount],
  ].filter(([, v]) => positiveAmount(v) != null);

  const totalServiceCharges = serviceCharges.reduce((s, [, v]) => s + positiveAmount(v), 0);
  const discount = positiveAmount(purchase.discountAmount);

  const paymentLines = [{ label: "Bill amount", value: purchase.subtotal }];
  if (positiveAmount(purchase.labourCost) != null) {
    paymentLines.push({ label: "Labour", value: purchase.labourCost });
  }
  if (positiveAmount(purchase.transportCost) != null) {
    paymentLines.push({ label: "Freight", value: purchase.transportCost });
  }
  if (positiveAmount(purchase.loadingCost) != null) {
    paymentLines.push({ label: "Loading", value: purchase.loadingCost });
  }
  if (positiveAmount(purchase.taxAmount) != null) {
    paymentLines.push({ label: "Tax / GST", value: purchase.taxAmount });
  }
  if (discount != null) {
    paymentLines.push({ label: "Discount", value: discount, discount: true });
  }
  paymentLines.push({ label: "Total amount", value: purchase.totalAmount, grand: true });
  paymentLines.push({ label: "Total received", value: purchase.paidAmount ?? 0 });
  paymentLines.push({
    label: "Remaining due (this bill)",
    value: balanceDue,
    due: balanceDue > 0,
    settled: balanceDue <= 0,
  });

  return (
    <article className="erp-purchase-invoice">
      <header className="erp-pi-header">
        <div className="erp-pi-header-inner">
          <div className="erp-pi-brand">
            <h1 className="erp-pi-company-name">{c.company_name}</h1>
            {c.tagline && <p className="erp-pi-company-tag">{c.tagline}</p>}
            <div className="erp-pi-company-meta">
              {[companyAddressLine(c), c.company_phone, c.company_email, c.ntn && `EIN ${c.ntn}`, c.strn && `State Tax ID ${c.strn}`]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>

          <div className="erp-pi-doc-meta">
            <p className="erp-pi-doc-kicker">Vendor bill</p>
            <p className="erp-pi-doc-no">{purchase.purchaseNumber || "—"}</p>
            <p className="erp-pi-doc-date">
              {purchase.purchaseDate ? formatDate(purchase.purchaseDate) : "—"}
            </p>
            <PaymentBadge status={purchase.paymentStatus} />
          </div>
        </div>
      </header>

      <section className="erp-pi-party">
        <div className="erp-pi-party-grid">
          <div className="erp-pi-party-cell">
            <span className="erp-pi-cell-label">Party name</span>
            <span className="erp-pi-cell-value is-name">{purchase.vendorName || "—"}</span>
          </div>
          <div className="erp-pi-party-cell">
            <span className="erp-pi-cell-label">Vendor type</span>
            <span className="erp-pi-cell-value">{vendorTypeLabel(purchase)}</span>
          </div>
          <div className="erp-pi-party-cell">
            <span className="erp-pi-cell-label">Mobile / WhatsApp</span>
            <span className="erp-pi-cell-value">{phone}</span>
          </div>
          <div className="erp-pi-party-cell">
            <span className="erp-pi-cell-label">Location</span>
            <span className="erp-pi-cell-value">{city}</span>
          </div>
          <div className="erp-pi-party-cell">
            <span className="erp-pi-cell-label">Order status</span>
            <span className="erp-pi-cell-value is-cap">{(purchase.status || "draft").replace(/_/g, " ")}</span>
          </div>
          <div className="erp-pi-party-cell">
            <span className="erp-pi-cell-label">Reference</span>
            <span className="erp-pi-cell-value font-mono">{purchase.purchaseNumber || "—"}</span>
          </div>
        </div>
      </section>

      <div className="erp-pi-table-wrap">
        <table className="erp-pi-table">
          <thead>
            <tr>
              <th className="w-10">#</th>
              <th>Item</th>
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
          <tfoot>
            <tr>
              <td colSpan={2} className="erp-pi-subtotal-label">Material sub-total</td>
              <td className="text-right tabular-nums font-semibold">{materialQty.toLocaleString("en-US")}</td>
              <td />
              <td className="text-right font-mono font-bold">{moneyPlain(purchase.subtotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className={`erp-pi-bottom${serviceCharges.length ? "" : " is-single"}`}>
        {serviceCharges.length > 0 && (
          <div className="erp-pi-charges">
            <p className="erp-pi-charges-title">Cargo & service charges</p>
            <div className="erp-pi-charges-list">
              {serviceCharges.map(([label, val]) => (
                <div key={label} className="erp-pi-charge-row">
                  <span>{label}</span>
                  <span className="font-mono">{moneyPlain(val)}</span>
                </div>
              ))}
            </div>
            <div className="erp-pi-charges-total">
              <span>Total charges</span>
              <span className="font-mono">{moneyPlain(totalServiceCharges)}</span>
            </div>
          </div>
        )}

        <div className="erp-pi-payment">
          <p className="erp-pi-payment-title">Payment summary</p>
          <div className="erp-pi-pay-grid">
            <div className="erp-pi-pay-head">Particulars</div>
            <div className="erp-pi-pay-head is-amt">Amount ($)</div>

            {paymentLines.map((row) => (
              <React.Fragment key={row.label}>
                <div
                  className={`erp-pi-pay-label${
                    row.grand ? " is-grand" : row.due ? " is-due" : row.settled ? " is-settled" : ""
                  }${row.discount ? " is-discount" : ""}`}
                >
                  {row.label}
                </div>
                <div
                  className={`erp-pi-pay-value${
                    row.grand ? " is-grand" : row.due ? " is-due" : row.settled ? " is-settled" : ""
                  }${row.discount ? " is-discount" : ""}`}
                >
                  {row.discount ? `− ${moneyPlain(row.value)}` : moneyPlain(row.value)}
                </div>
              </React.Fragment>
            ))}

            <div className="erp-pi-pay-label is-balance">Previous balance</div>
            <div className="erp-pi-pay-value is-balance">{formatCurrency(previousBalance)}</div>

            <div className="erp-pi-pay-label is-current">Current balance</div>
            <div className="erp-pi-pay-value is-current">{formatCurrency(currentBalance)}</div>
          </div>
        </div>
      </div>

      {purchase.notes && (
        <div className="erp-pi-notes">
          <strong>Note:</strong> {purchase.notes}
        </div>
      )}

      <footer className="erp-pi-signature">
        <div>
          <div className="erp-pi-sig-line" />
          <p className="erp-pi-sig-role">Prepared by</p>
        </div>
      </footer>

      <p className="erp-pi-footnote">
        {c.company_name} · Computer-generated vendor bill
      </p>
    </article>
  );
}

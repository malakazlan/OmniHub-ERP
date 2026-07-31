"use client";

import React from "react";
import DocumentBillShell, {
  DEFAULT_COMPANY,
  BillSection,
  BillFieldGrid,
  BillSummaryTable,
} from "@/components/documents/DocumentBillShell";
import { formatCurrency, formatQuantity } from "@/lib/formatters";
import { amountInWords } from "@/lib/amountInWords";

function money(val) {
  return formatCurrency(val ?? 0);
}

function moneyPlain(val) {
  return formatCurrency(val ?? 0, false);
}

const thClass = "px-2 py-1.5 text-left text-[10px] font-semibold uppercase text-slate-500 bg-slate-50 border-b border-slate-200";
const tdClass = "px-2 py-1.5 text-[11px] border-b border-slate-100";

export default function SaleInvoice({ sale, company = DEFAULT_COMPANY }) {
  if (!sale) return null;

  const items = sale.items || [];
  const customerPhone = sale.shop?.phone || sale.company?.phone || "";
  const balanceDue = Math.max((sale.totalAmount || 0) - (sale.paidAmount || 0), 0);

  const extraCosts = [
    ["Transport", sale.transportCost],
    ["Loading", sale.loadingCost],
    ["Tax / GST", sale.taxAmount],
  ].filter(([, v]) => parseFloat(v) > 0);

  const discount = parseFloat(sale.discountAmount) > 0 ? sale.discountAmount : null;

  const chargeLines = [
    { key: "subtotal", label: "Items subtotal", value: moneyPlain(sale.subtotal) },
    ...extraCosts.map(([label, val]) => ({
      key: label,
      label,
      value: moneyPlain(val),
    })),
    ...(discount != null
      ? [{ key: "discount", label: "Discount", value: `− ${moneyPlain(discount)}` }]
      : []),
    {
      key: "grand",
      label: "Grand total",
      value: moneyPlain(sale.totalAmount),
      bold: true,
      accent: true,
    },
  ];

  const paymentLines = [
    { key: "paid", label: "Received to date", value: moneyPlain(sale.paidAmount) },
    {
      key: "balance",
      label: "Balance receivable",
      value: moneyPlain(balanceDue),
      bold: true,
      danger: balanceDue > 0,
    },
  ];

  return (
    <DocumentBillShell
      company={company}
      documentTitle="Sales invoice"
      refNo={sale.invoiceNumber}
      date={sale.saleDate}
      signatureLabel="Sales officer"
      footerNote="System-generated document · Warraich Traders ERP"
    >
      <BillSection title="Customer">
        <BillFieldGrid
          rows={[
            { label: "Name", value: sale.customerName },
            { label: "Phone", value: customerPhone || "—" },
            {
              label: "Type",
              value: sale.shopId ? "Shop" : sale.companyId ? "Company" : "Customer",
            },
            { label: "Order status", value: sale.status || "—" },
          ]}
        />
      </BillSection>

      {(sale.vehicleNumber || sale.driverName) && (
        <BillSection title="Dispatch">
          <BillFieldGrid
            rows={[
              ...(sale.vehicleNumber ? [{ label: "Vehicle", value: sale.vehicleNumber }] : []),
              ...(sale.driverName ? [{ label: "Driver", value: sale.driverName }] : []),
            ]}
          />
        </BillSection>
      )}

      <BillSection title="Line items">
        <div className="overflow-x-auto rounded border border-slate-200">
          <table className="w-full min-w-[280px] border-collapse">
            <thead>
              <tr>
                <th className={`${thClass} w-8`}>#</th>
                <th className={thClass}>Product</th>
                <th className={`${thClass} text-right w-20`}>Qty</th>
                <th className={`${thClass} text-right w-20`}>Rate</th>
                <th className={`${thClass} text-right w-24`}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id || i}>
                  <td className={`${tdClass} text-center text-slate-500`}>{i + 1}</td>
                  <td className={`${tdClass} font-medium`}>{item.productName}</td>
                  <td className={`${tdClass} text-right tabular-nums`}>
                    {formatQuantity(item.quantity, item.unit)}
                  </td>
                  <td className={`${tdClass} text-right font-mono tabular-nums`}>{moneyPlain(item.rate)}</td>
                  <td className={`${tdClass} text-right font-mono font-semibold tabular-nums`}>
                    {moneyPlain(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </BillSection>

      {(extraCosts.length > 0 || discount != null) && (
        <BillSection title="Additional charges">
          <BillSummaryTable
            lines={[
              ...extraCosts.map(([label, val]) => ({ key: label, label, value: moneyPlain(val) })),
              ...(discount != null
                ? [{ key: "disc", label: "Discount", value: `− ${moneyPlain(discount)}` }]
                : []),
            ]}
          />
        </BillSection>
      )}

      <BillSection title="Amount summary">
        <BillSummaryTable lines={chargeLines} highlightKey="grand" />
      </BillSection>

      <BillSection title="Payment">
        <BillFieldGrid
          rows={[
            { label: "Status", value: (sale.paymentStatus || "—").toUpperCase() },
            ...(parseFloat(sale.cashAmount) > 0 ? [{ label: "Cash", value: money(sale.cashAmount) }] : []),
            ...(parseFloat(sale.bankAmount) > 0 ? [{ label: "Bank", value: money(sale.bankAmount) }] : []),
          ]}
        />
        <div className="mt-2 pt-2 border-t border-slate-100">
          <BillSummaryTable lines={paymentLines} highlightKey="balance" />
        </div>
      </BillSection>

      <div className="rounded border border-slate-200 bg-slate-50/50 px-2.5 py-2 text-[10px] leading-snug">
        <span className="font-semibold">In words: </span>
        {amountInWords(sale.totalAmount)}
      </div>

      {sale.notes && (
        <p className="text-[10px] text-slate-600">
          <span className="font-semibold">Note: </span>
          {sale.notes}
        </p>
      )}
    </DocumentBillShell>
  );
}

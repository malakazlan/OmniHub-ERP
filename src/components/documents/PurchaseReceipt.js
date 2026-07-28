"use client";

import React from "react";
import { DEFAULT_COMPANY } from "@/components/documents/DocumentBillShell";
import { formatCurrency, formatDate, formatQuantity } from "@/lib/formatters";
import { computeVendorBalancesForPurchase } from "@/lib/purchaseBalances";

function moneyPlain(val) {
  return formatCurrency(val ?? 0, false);
}

function partyMeta(purchase) {
  const phone = purchase.farmer?.phone || purchase.company?.phone || "N/A";
  const city = purchase.farmer?.city || purchase.company?.city || "—";
  return { phone, city };
}

/**
 * Purchase invoice / receipt — party header, items, charges, balances (print/PDF).
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
  const outerCharges =
    (parseFloat(purchase.transportCost) || 0) +
    (parseFloat(purchase.loadingCost) || 0) +
    (parseFloat(purchase.labourCost) || 0);

  const th =
    "border border-slate-400 px-2 py-1.5 text-[10px] font-bold uppercase bg-slate-700 text-white";
  const td = "border border-slate-300 px-2 py-1.5 text-[11px]";

  return (
    <article className="erp-document-bill w-full max-w-[640px] mx-auto bg-white text-slate-900 border border-slate-300 shadow-sm overflow-hidden text-[12px]">
      {/* Company + title */}
      <header className="px-4 pt-4 pb-2 text-center border-b border-slate-300">
        <p className="text-base font-black uppercase tracking-wide text-slate-900">{c.company_name}</p>
        {c.tagline && <p className="text-[10px] text-slate-500 uppercase mt-0.5">{c.tagline}</p>}
        {c.company_address && (
          <p className="text-[10px] text-slate-600 mt-1">{c.company_address}</p>
        )}
        <h1 className="mt-3 text-sm font-black uppercase tracking-[0.2em] border-b-2 border-slate-800 inline-block pb-0.5">
          Purchase invoice
        </h1>
      </header>

      {/* Party + invoice meta */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border-b border-slate-300">
        <div className="p-3 space-y-1.5 border-b sm:border-b-0 sm:border-r border-slate-300">
          <MetaRow label="Party name" value={purchase.vendorName} bold />
          <MetaRow label="Mobile / WhatsApp" value={phone} />
          <MetaRow label="Location" value={city} />
          <MetaRow label="Ref no." value={purchase.purchaseNumber} mono />
        </div>
        <div className="p-3 space-y-1.5 bg-slate-50/50">
          <MetaRow label="Invoice no." value={purchase.purchaseNumber} mono bold />
          <MetaRow label="Date" value={formatDate(purchase.purchaseDate)} />
          <MetaRow label="Status" value={(purchase.status || "draft").toUpperCase()} />
          <MetaRow label="Payment" value={(purchase.paymentStatus || "unpaid").toUpperCase()} />
        </div>
      </div>

      {/* Items */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[300px]">
          <thead>
            <tr>
              <th className={`${th} w-8`}>S#</th>
              <th className={th}>Product name</th>
              <th className={`${th} text-right w-16`}>Qty</th>
              <th className={`${th} text-right w-20`}>Rate</th>
              <th className={`${th} text-right w-24`}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id || i}>
                <td className={`${td} text-center`}>{i + 1}</td>
                <td className={`${td} font-medium`}>{item.productName}</td>
                <td className={`${td} text-right tabular-nums`}>
                  {formatQuantity(item.quantity, item.unit)}
                </td>
                <td className={`${td} text-right font-mono tabular-nums`}>{moneyPlain(item.rate)}</td>
                <td className={`${td} text-right font-mono font-semibold tabular-nums`}>
                  {moneyPlain(item.amount)}
                </td>
              </tr>
            ))}
            <tr className="bg-slate-100 font-bold">
              <td colSpan={2} className={`${td} text-right uppercase text-[10px]`}>
                Material sub-total
              </td>
              <td className={`${td} text-right tabular-nums`}>{materialQty.toLocaleString("en-PK")}</td>
              <td className={td} />
              <td className={`${td} text-right font-mono underline decoration-double`}>
                {moneyPlain(purchase.subtotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Charges + totals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border-t border-slate-300">
        <div className="p-3 border-b sm:border-b-0 sm:border-r border-slate-300">
          <p className="text-[10px] font-bold uppercase text-sky-800 bg-sky-50 border border-sky-200 px-2 py-1 mb-2">
            Cargo & service charges
          </p>
          <ChargeRow label="Transport" value={purchase.transportCost} />
          <ChargeRow label="Loading" value={purchase.loadingCost} />
          <ChargeRow label="Labour" value={purchase.labourCost} />
          <ChargeRow label="Tax / GST" value={purchase.taxAmount} />
          <div className="flex justify-between mt-2 pt-2 border-t border-slate-200 text-[11px] font-bold">
            <span>Total charges</span>
            <span className="font-mono">{moneyPlain(outerCharges + (parseFloat(purchase.taxAmount) || 0))}</span>
          </div>
        </div>

        <div className="p-0">
          <table className="w-full border-collapse text-[11px]">
            <tbody>
              <TotalRow label="Bill amount" value={purchase.subtotal} />
              <TotalRow label="Labour" value={purchase.labourCost} />
              <TotalRow label="Transport" value={purchase.transportCost} />
              <TotalRow label="Loading" value={purchase.loadingCost} />
              {parseFloat(purchase.discountAmount) > 0 && (
                <TotalRow label="Discount" value={-purchase.discountAmount} danger />
              )}
              <TotalRow label="Total amount" value={purchase.totalAmount} bold />
              <TotalRow label="Total received" value={purchase.paidAmount} bold />
              <TotalRow label="Remaining due (this bill)" value={balanceDue} accent />
              <tr className="bg-sky-100">
                <td className="border border-slate-300 px-2 py-1.5 font-semibold">Previous balance</td>
                <td className="border border-slate-300 px-2 py-1.5 text-right font-mono font-semibold">
                  {formatCurrency(previousBalance)}
                </td>
              </tr>
              <tr className="bg-sky-200">
                <td className="border border-slate-300 px-2 py-1.5 font-black">Current balance</td>
                <td className="border border-slate-300 px-2 py-1.5 text-right font-mono font-black">
                  {formatCurrency(currentBalance)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {purchase.notes && (
        <p className="px-3 py-2 text-[10px] border-t border-slate-200 text-slate-600">
          <span className="font-semibold">Notes: </span>
          {purchase.notes}
        </p>
      )}

      <footer className="px-4 py-6 border-t border-slate-300 flex justify-between items-end">
        <div>
          <p className="text-[10px] font-bold uppercase text-slate-500">Prepared by</p>
          <div className="w-40 border-t border-slate-500 mt-8" />
        </div>
        <p className="text-[9px] text-slate-400">Metro Feeds ERP · Computer generated</p>
      </footer>
    </article>
  );
}

function MetaRow({ label, value, bold, mono }) {
  return (
    <div className="flex gap-2 text-[11px]">
      <span className="text-slate-500 shrink-0 w-[100px]">{label}</span>
      <span
        className={`${bold ? "font-bold" : "font-medium"} ${mono ? "font-mono" : ""} text-slate-900 break-all`}
      >
        {value || "—"}
      </span>
    </div>
  );
}

function ChargeRow({ label, value }) {
  const n = parseFloat(value) || 0;
  if (n <= 0) return null;
  return (
    <div className="flex justify-between text-[11px] py-0.5 border-b border-slate-100 last:border-0">
      <span className="text-slate-600">{label}</span>
      <span className="font-mono">{moneyPlain(n)}</span>
    </div>
  );
}

function TotalRow({ label, value, bold, accent, danger }) {
  const n = parseFloat(value) || 0;
  return (
    <tr>
      <td
        className={`border border-slate-300 px-2 py-1 ${bold ? "font-bold" : ""} ${accent ? "font-semibold text-sky-900" : ""}`}
      >
        {label}
      </td>
      <td
        className={`border border-slate-300 px-2 py-1 text-right font-mono w-[120px] ${bold ? "font-bold" : ""} ${danger ? "text-rose-700" : ""}`}
      >
        {moneyPlain(n)}
      </td>
    </tr>
  );
}

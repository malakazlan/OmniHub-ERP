"use client";

import React from "react";
import { DEFAULT_COMPANY } from "@/components/documents/DocumentBillShell";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { companyAddressLine } from "@/lib/companyProfile";

function moneyPlain(val) {
  return formatCurrency(val ?? 0, false);
}

function MetaRow({ label, value, bold, mono }) {
  return (
    <div className="flex gap-2 text-[11px] leading-snug">
      <span className="text-slate-500 shrink-0 w-[100px]">{label}</span>
      <span className={`text-slate-900 ${bold ? "font-bold" : ""} ${mono ? "font-mono" : ""}`}>{value || "—"}</span>
    </div>
  );
}

function TotalRow({ label, value, bold, accent, danger }) {
  const cls = danger ? "text-rose-700" : accent ? "text-sky-800" : "text-slate-900";
  return (
    <tr className={bold ? "bg-slate-100 font-bold" : ""}>
      <td className="border border-slate-300 px-2 py-1.5 text-[11px]">{label}</td>
      <td className={`border border-slate-300 px-2 py-1.5 text-right font-mono tabular-nums text-[11px] ${cls}`}>
        {formatCurrency(value ?? 0)}
      </td>
    </tr>
  );
}

export default function PaymentReceipt({ receipt, company = DEFAULT_COMPANY }) {
  if (!receipt) return null;

  const c = { ...DEFAULT_COMPANY, ...company, ...(receipt.company || {}) };
  const isPay = receipt.mode === "pay";
  const title = receipt.title || (isPay ? "Payment voucher" : "Receipt voucher");
  const headerBg = isPay ? "bg-rose-700" : "bg-emerald-700";
  const bannerBg = isPay ? "bg-rose-50 border-rose-200 text-rose-900" : "bg-emerald-50 border-emerald-200 text-emerald-900";

  return (
    <article className="erp-document-bill w-full max-w-[640px] mx-auto bg-white text-slate-900 border border-slate-300 shadow-sm overflow-hidden text-[12px]">
      <div
        className={`erp-voucher-header ${isPay ? "is-pay" : "is-receive"}`}
        style={{
          backgroundColor: isPay ? "#be123c" : "#047857",
          color: "#ffffff",
          padding: "1.15rem 1rem 1rem",
          textAlign: "center",
        }}
      >
        <p
          className="erp-voucher-company"
          style={{
            margin: 0,
            padding: 0,
            fontSize: "1.15rem",
            fontWeight: 800,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            lineHeight: 1.2,
            color: "#ffffff",
          }}
        >
          {c.company_name}
        </p>
        {companyAddressLine(c) && (
          <p
            className="erp-voucher-sub"
            style={{
              margin: "0.2rem 0 0 0",
              padding: 0,
              fontSize: "0.65rem",
              color: "#f1f5f9",
              lineHeight: 1.3,
            }}
          >
            {companyAddressLine(c)}
          </p>
        )}
        {(c.company_phone || c.ntn) && (
          <p
            className="erp-voucher-sub"
            style={{
              margin: "0.2rem 0 0 0",
              padding: 0,
              fontSize: "0.65rem",
              color: "#f1f5f9",
              lineHeight: 1.3,
            }}
          >
            {[c.company_phone, c.ntn ? `EIN: ${c.ntn}` : ""].filter(Boolean).join(" · ")}
          </p>
        )}
        <div
          className="erp-voucher-title"
          style={{
            margin: "0.6rem 0 0 0",
            padding: 0,
            fontSize: "1.1rem",
            fontWeight: 900,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            lineHeight: 1.2,
            color: "#ffffff",
          }}
        >
          {title}
        </div>
      </div>

      <div className={`mx-4 mt-3 rounded-lg border px-3 py-2 text-center text-[11px] font-semibold ${bannerBg}`}>
        {isPay ? "Payment made to" : "Amount received from"}: {receipt.partyName}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border-b border-slate-300 mt-3">
        <div className="p-3 space-y-1.5 border-b sm:border-b-0 sm:border-r border-slate-300">
          <MetaRow label="Party name" value={receipt.partyName} bold />
          <MetaRow label="Account type" value={receipt.partyCategory} />
          <MetaRow label="Voucher no." value={receipt.paymentNumber} mono bold />
        </div>
        <div className="p-3 space-y-1.5 bg-slate-50/50">
          <MetaRow label="Date" value={formatDate(receipt.paymentDate)} />
          <MetaRow label="Method" value={(receipt.paymentMethod || "cash").replace(/_/g, " ")} />
          <MetaRow label="Recorded by" value={receipt.createdByName} />
        </div>
      </div>

      <div className="p-3 border-b border-slate-300">
        <p className="text-[10px] font-bold uppercase text-slate-500 mb-2">Payment breakdown</p>
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-slate-700 text-white">
              <th className="border border-slate-500 px-2 py-1.5 text-left text-[10px] uppercase">Mode</th>
              <th className="border border-slate-500 px-2 py-1.5 text-left text-[10px] uppercase">Account</th>
              <th className="border border-slate-500 px-2 py-1.5 text-right text-[10px] uppercase">Amount</th>
            </tr>
          </thead>
          <tbody>
            {receipt.cashAmount > 0 && (
              <tr>
                <td className="border border-slate-300 px-2 py-1.5 font-medium text-emerald-800">Cash</td>
                <td className="border border-slate-300 px-2 py-1.5">{receipt.cashAccountName || "Cash"}</td>
                <td className="border border-slate-300 px-2 py-1.5 text-right font-mono font-semibold">
                  {moneyPlain(receipt.cashAmount)}
                </td>
              </tr>
            )}
            {receipt.bankAmount > 0 && (
              <tr>
                <td className="border border-slate-300 px-2 py-1.5 font-medium text-sky-800">Bank</td>
                <td className="border border-slate-300 px-2 py-1.5">{receipt.bankAccountName || "Bank"}</td>
                <td className="border border-slate-300 px-2 py-1.5 text-right font-mono font-semibold">
                  {moneyPlain(receipt.bankAmount)}
                </td>
              </tr>
            )}
            <tr className={isPay ? "bg-rose-50 font-bold" : "bg-emerald-50 font-bold"}>
              <td colSpan={2} className={`border border-slate-300 px-2 py-1.5 uppercase text-[10px] ${isPay ? "text-rose-800" : "text-emerald-800"}`}>
                Total {isPay ? "paid" : "received"}
              </td>
              <td className={`border border-slate-300 px-2 py-1.5 text-right font-mono text-sm ${isPay ? "text-rose-800" : "text-emerald-800"}`}>
                {moneyPlain(receipt.totalAmount)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {receipt.billsCleared?.length > 0 && (
        <div className="p-3 border-b border-slate-300">
          <p className="text-[10px] font-bold uppercase text-teal-800 bg-teal-50 border border-teal-200 px-2 py-1 mb-2">
            Bills / invoices cleared
          </p>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 px-2 py-1 text-left">Reference</th>
                <th className="border border-slate-300 px-2 py-1 text-right">Amount</th>
                <th className="border border-slate-300 px-2 py-1 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {receipt.billsCleared.map((b) => (
                <tr key={b.id || b.purchaseNumber || b.invoiceNumber}>
                  <td className="border border-slate-300 px-2 py-1 font-mono">
                    {b.purchaseNumber || b.invoiceNumber || `#${b.id}`}
                  </td>
                  <td className="border border-slate-300 px-2 py-1 text-right font-mono">{moneyPlain(b.amount)}</td>
                  <td className="border border-slate-300 px-2 py-1 text-center text-[10px] uppercase">
                    {b.clearsFully ? "Paid" : b.paymentStatus || "Partial"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="p-3">
        <table className="w-full border-collapse">
          <tbody>
            <TotalRow label="Previous pending balance" value={receipt.previousBalance} />
            <TotalRow
              label={isPay ? "Total paid (this voucher)" : "Total received (this voucher)"}
              value={receipt.totalAmount}
              bold
            />
            <TotalRow label="Pending balance" value={receipt.pendingBalance} bold accent />
          </tbody>
        </table>
      </div>

      {(receipt.description || receipt.notes) && (
        <div className="px-3 pb-3 text-[11px] text-slate-600 border-t border-slate-200 pt-2 mx-3 mb-3">
          {receipt.description && <p><span className="font-semibold text-slate-700">Description:</span> {receipt.description}</p>}
          {receipt.notes && <p className="mt-1"><span className="font-semibold text-slate-700">Notes:</span> {receipt.notes}</p>}
        </div>
      )}

      <footer className="border-t border-slate-300 px-4 py-2 text-center text-[10px] text-slate-500">
        Computer-generated voucher · {c.company_name}
      </footer>
    </article>
  );
}

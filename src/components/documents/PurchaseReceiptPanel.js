"use client";

import React from "react";
import { Button } from "@/components/Button";
import PurchaseReceipt from "@/components/documents/PurchaseReceipt";
import { DocumentReceiptPanel } from "@/components/documents/DocumentReceiptPanel";
import { FileText, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

export function PurchaseReceiptPanel({
  purchase,
  company,
  open,
  onClose,
  title = "Supplier purchase bill",
  onPay,
}) {
  if (!purchase) return null;

  const pdfFilename = `${purchase.purchaseNumber || "purchase"}-bill.pdf`.replace(/\s+/g, "-");
  const balanceDue = Math.max((purchase.totalAmount || 0) - (purchase.paidAmount || 0), 0);
  const canPay =
    balanceDue > 0 &&
    onPay &&
    purchase.status !== "draft" &&
    purchase.status !== "cancelled";

  return (
    <DocumentReceiptPanel
      open={open}
      onClose={onClose}
      title={title}
      hint="Compact ERP bill — scroll if needed. Print/PDF uses full document size."
      pdfFilename={pdfFilename}
      actions={
        canPay ? (
          <Button
            type="button"
            onClick={onPay}
            className="bg-teal-700 hover:bg-teal-800 border-0 min-h-[40px] text-sm"
          >
            <Wallet className="w-4 h-4" /> Pay {formatCurrency(balanceDue)}
          </Button>
        ) : null
      }
    >
      <PurchaseReceipt purchase={purchase} company={company} />
    </DocumentReceiptPanel>
  );
}

export function PurchaseReceiptPreviewCard({ purchase, company, onOpen }) {
  return (
    <div className="no-print rounded-2xl border border-teal-200/80 bg-gradient-to-br from-slate-50 via-teal-50/40 to-white p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-800 to-teal-800 text-white flex items-center justify-center shrink-0 shadow-md">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Purchase bill</h3>
            <p className="text-xs text-slate-500 mt-0.5">Print or PDF for {purchase.vendorName}</p>
          </div>
        </div>
        <Button
          type="button"
          onClick={onOpen}
          className="bg-teal-700 hover:bg-teal-800 border-0 w-full sm:w-auto min-h-[44px]"
        >
          <FileText className="w-4 h-4" /> View bill
        </Button>
      </div>
    </div>
  );
}

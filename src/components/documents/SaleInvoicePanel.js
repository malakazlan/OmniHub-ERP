"use client";

import React from "react";
import { Button } from "@/components/Button";
import SaleInvoice from "@/components/documents/SaleInvoice";
import { DocumentReceiptPanel } from "@/components/documents/DocumentReceiptPanel";
import { getSaleWhatsAppPhone } from "@/lib/invoicePartyContact";
import { FileText } from "lucide-react";

export function SaleInvoicePanel({ sale, company, open, onClose, title = "Sales invoice", autoAction = null, onAutoActionDone, whatsappPhone = null }) {
  if (!sale) return null;

  const pdfFilename = `${sale.invoiceNumber || "invoice"}-bill.pdf`.replace(/\s+/g, "-");
  const waPhone = whatsappPhone || getSaleWhatsAppPhone(sale);

  return (
    <DocumentReceiptPanel
      open={open}
      onClose={onClose}
      title={title}
      hint="Customer invoice — print, PDF, or send via WhatsApp (image copied to clipboard)."
      pdfFilename={pdfFilename}
      autoAction={autoAction}
      onAutoActionDone={onAutoActionDone}
      saleInvoicePdf={{ sale, company }}
      whatsappPhone={waPhone}
    >
      <SaleInvoice sale={sale} company={company} />
    </DocumentReceiptPanel>
  );
}

export function SaleInvoicePreviewCard({ sale, onOpen }) {
  return (
    <div className="no-print rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-slate-50 via-emerald-50/40 to-white p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-800 to-slate-800 text-white flex items-center justify-center shrink-0 shadow-md">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Sales invoice</h3>
            <p className="text-xs text-slate-500 mt-0.5">Bill for {sale.customerName}</p>
          </div>
        </div>
        <Button
          type="button"
          onClick={onOpen}
          className="bg-emerald-700 hover:bg-emerald-800 border-0 w-full sm:w-auto min-h-[44px]"
        >
          <FileText className="w-4 h-4" /> View invoice
        </Button>
      </div>
    </div>
  );
}

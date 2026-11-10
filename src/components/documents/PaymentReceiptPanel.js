"use client";

import React from "react";
import { DocumentReceiptPanel } from "@/components/documents/DocumentReceiptPanel";
import PaymentReceipt from "@/components/documents/PaymentReceipt";
import { getPaymentReceiptWhatsAppPhone } from "@/lib/invoicePartyContact";

export function PaymentReceiptPanel({ receipt, company, open, onClose, title, whatsappPhone = null }) {
  const voucherTitle =
    title ||
    (receipt?.mode === "pay" ? "Payment voucher" : "Receipt voucher");
  const filename = receipt?.paymentNumber
    ? `${receipt.paymentNumber.replace(/\s+/g, "-")}.pdf`
    : "payment-voucher.pdf";
  const waPhone = whatsappPhone || getPaymentReceiptWhatsAppPhone(receipt);

  return (
    <DocumentReceiptPanel
      open={open}
      onClose={onClose}
      title={voucherTitle}
      hint="Print, PDF, or share this voucher via WhatsApp (image copied to clipboard)."
      pdfFilename={filename}
      paymentReceiptPdf={{ receipt, company }}
      whatsappPhone={waPhone}
    >
      <PaymentReceipt receipt={receipt} company={company} />
    </DocumentReceiptPanel>
  );
}

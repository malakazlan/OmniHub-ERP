"use client";

import React from "react";
import { DocumentReceiptPanel } from "@/components/documents/DocumentReceiptPanel";
import PaymentReceipt from "@/components/documents/PaymentReceipt";

export function PaymentReceiptPanel({ receipt, company, open, onClose, title }) {
  const voucherTitle =
    title ||
    (receipt?.mode === "pay" ? "Payment voucher" : "Receipt voucher");
  const filename = receipt?.paymentNumber
    ? `${receipt.paymentNumber.replace(/\s+/g, "-")}.pdf`
    : "payment-voucher.pdf";

  return (
    <DocumentReceiptPanel
      open={open}
      onClose={onClose}
      title={voucherTitle}
      hint="Print or save this payment / receipt voucher for your records."
      pdfFilename={filename}
      paymentReceiptPdf={{ receipt, company }}
    >
      <PaymentReceipt receipt={receipt} company={company} />
    </DocumentReceiptPanel>
  );
}

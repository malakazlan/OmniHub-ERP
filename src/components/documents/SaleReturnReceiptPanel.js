"use client";

import React from "react";
import SaleReturnReceipt from "@/components/documents/SaleReturnReceipt";
import { DocumentReceiptPanel } from "@/components/documents/DocumentReceiptPanel";

export function SaleReturnReceiptPanel({
  saleReturn,
  sale,
  company,
  open,
  onClose,
  title = "Sale return receipt",
}) {
  if (!saleReturn) return null;

  const pdfFilename = `${saleReturn.returnNumber || "return"}-receipt.pdf`.replace(/\s+/g, "-");

  return (
    <DocumentReceiptPanel
      open={open}
      onClose={onClose}
      title={title}
      hint="Return receipt — print or save as PDF."
      pdfFilename={pdfFilename}
    >
      <SaleReturnReceipt saleReturn={saleReturn} sale={sale} company={company} />
    </DocumentReceiptPanel>
  );
}

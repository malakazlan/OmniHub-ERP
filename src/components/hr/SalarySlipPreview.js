"use client";

import React from "react";
import SalarySlipReceipt from "@/components/hr/SalarySlipReceipt";

export default function SalarySlipPreview({ preview, company = {}, clearanceExtras = {} }) {
  if (!preview) return null;
  return (
    <SalarySlipReceipt
      preview={preview}
      company={company}
      clearanceExtras={clearanceExtras}
    />
  );
}

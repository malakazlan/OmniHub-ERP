"use client";

import React, { forwardRef } from "react";
import SalarySlipReceipt from "@/components/hr/SalarySlipReceipt";

const SalarySlipPrintView = forwardRef(function SalarySlipPrintView(
  { record, company = {}, employee = {} },
  ref
) {
  if (!record) return null;

  const enrichedRecord = employee?.name
    ? { ...record, employee: { ...record.employee, ...employee } }
    : record;

  return (
    <div ref={ref} className="erp-salary-slip-print">
      <SalarySlipReceipt record={enrichedRecord} company={company} printMode />
    </div>
  );
});

export default SalarySlipPrintView;

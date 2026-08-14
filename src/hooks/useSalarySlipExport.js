"use client";

import { useState, useCallback } from "react";
import { useReactToPrint } from "react-to-print";
import { useToast } from "@/context/ToastContext";
import { downloadSalarySlipPdf } from "@/lib/salarySlipPdf";

const PRINT_STYLE = `
  @page { size: A4 portrait; margin: 10mm; }
  @media print {
    html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; print-color-adjust: exact; }
  }
`;

export function useSalarySlipExport({ printRef, company = {} }) {
  const { showToast } = useToast();
  const [pdfLoadingId, setPdfLoadingId] = useState(null);
  const [activeRecord, setActiveRecord] = useState(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: activeRecord ? `salary-slip-${activeRecord.id}` : "salary-slip",
    pageStyle: PRINT_STYLE,
  });

  const onPrintSlip = useCallback(
    (record) => {
      setActiveRecord(record);
      setTimeout(() => handlePrint(), 50);
    },
    [handlePrint]
  );

  const onPdfSlip = useCallback(
    async (record) => {
      setPdfLoadingId(record.id);
      try {
        downloadSalarySlipPdf({
          record,
          employee: record.employee,
          company,
          filename: `salary-slip-${record.employee?.name?.replace(/\s+/g, "-") || record.id}-${record.month}-${record.year}.pdf`,
        });
        showToast("Salary slip PDF downloaded", "success");
      } catch (err) {
        console.error(err);
        showToast("Failed to generate PDF", "error");
      } finally {
        setPdfLoadingId(null);
      }
    },
    [company, showToast]
  );

  return { pdfLoadingId, activeRecord, onPrintSlip, onPdfSlip };
}

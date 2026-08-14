"use client";

import { useState, useCallback } from "react";
import { useReactToPrint } from "react-to-print";
import { useToast } from "@/context/ToastContext";
import { downloadRegisterPdf } from "@/lib/registerPdf";

const PRINT_STYLE = `
  @page {
    size: A4 landscape;
    margin: 8mm 10mm 10mm 10mm;
  }
  @media print {
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
`;

export function useRegisterExport({
  printRef,
  title,
  subtitle = "",
  company = {},
  columns = [],
  rows = [],
  footers = [],
  filename,
  emptyMessage = "No records to export",
}) {
  const { showToast } = useToast();
  const [pdfLoading, setPdfLoading] = useState(false);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: title.replace(/[^\w\s-]/g, ""),
    pageStyle: PRINT_STYLE,
  });

  const onPrint = useCallback(() => {
    if (rows.length === 0) {
      showToast(emptyMessage, "warning");
      return;
    }
    handlePrint();
  }, [rows.length, emptyMessage, showToast, handlePrint]);

  const onExportPdf = useCallback(async () => {
    if (rows.length === 0) {
      showToast(emptyMessage, "warning");
      return;
    }
    setPdfLoading(true);
    try {
      downloadRegisterPdf({
        title,
        subtitle,
        company,
        columns: columns.map((c) => ({
          label: c.label,
          width: c.pdfWidth || 30,
          align: c.align,
          get: c.get,
          tone: c.tone,
          bold: c.bold,
        })),
        rows,
        footers,
        filename: filename || `${title.toLowerCase().replace(/\s+/g, "-")}.pdf`,
      });
      showToast("PDF downloaded", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to generate PDF", "error");
    } finally {
      setPdfLoading(false);
    }
  }, [rows, title, subtitle, company, columns, footers, filename, emptyMessage, showToast]);

  return { pdfLoading, onPrint, onExportPdf };
}

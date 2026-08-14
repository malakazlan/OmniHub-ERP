"use client";

import React from "react";
import { Printer, FileDown, Loader2 } from "lucide-react";

export default function RegisterExportToolbar({
  onPrint,
  onExportPdf,
  pdfLoading = false,
  disabled = false,
  resultCount = 0,
  label = "register",
}) {
  return (
    <div className="erp-register-export no-print">
      <span className="erp-register-export-count">
        <strong className="tabular-nums">{resultCount}</strong> in {label}
      </span>
      <div className="erp-register-export-actions">
        <button
          type="button"
          onClick={onPrint}
          disabled={disabled}
          className="erp-register-export-btn"
          title="Print"
        >
          <Printer className="w-4 h-4" />
          Print
        </button>
        <button
          type="button"
          onClick={onExportPdf}
          disabled={disabled || pdfLoading}
          className="erp-register-export-btn erp-register-export-btn-primary"
          title="Download PDF"
        >
          {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
          PDF
        </button>
      </div>
    </div>
  );
}

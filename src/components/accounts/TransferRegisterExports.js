"use client";

import React from "react";
import RegisterPrintView from "@/components/reports/RegisterPrintView";
import RegisterExportToolbar from "@/components/reports/RegisterExportToolbar";
import { useRegisterExport } from "@/hooks/useRegisterExport";

export default function TransferRegisterExports({
  printRef,
  title,
  subtitle,
  company,
  columns,
  rows,
  footers,
  filename,
  toolbarSlot,
  children,
}) {
  const { pdfLoading, onPrint, onExportPdf } = useRegisterExport({
    printRef,
    title,
    subtitle,
    company,
    columns,
    rows,
    footers,
    filename,
  });

  const toolbar = (
    <RegisterExportToolbar
      onPrint={onPrint}
      onExportPdf={onExportPdf}
      pdfLoading={pdfLoading}
      disabled={rows.length === 0}
      resultCount={rows.length}
    />
  );

  return (
    <>
      {typeof toolbarSlot === "function" ? toolbarSlot(toolbar) : toolbar}
      {children}
      <div className="erp-register-print-host" aria-hidden>
        <RegisterPrintView
          ref={printRef}
          title={title}
          company={company}
          columns={columns}
          rows={rows}
          footers={footers}
        />
      </div>
    </>
  );
}

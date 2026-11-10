"use client";

import React, { useRef, useState, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/Button";
import { downloadReceiptPdf, waitForInvoiceElement } from "@/lib/downloadReceiptPdf";
import { downloadSaleInvoicePdf } from "@/lib/saleInvoicePdf";
import { downloadPaymentReceiptPdf } from "@/lib/paymentReceiptPdf";
import { shareInvoiceOnWhatsApp } from "@/lib/invoiceWhatsApp";
import { Printer, Download, Loader2, MessageCircle } from "lucide-react";
import { useToast } from "@/context/ToastContext";

const A4_PRINT_STYLE = `
  @page { size: A4 portrait; margin: 10mm; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .erp-document-bill { max-width: 100% !important; box-shadow: none !important; }
    .erp-sale-invoice { max-width: 100% !important; box-shadow: none !important; border: none !important; }
    .erp-purchase-invoice { max-width: 100% !important; box-shadow: none !important; border: none !important; }
  }
`;

export function DocumentReceiptPanel({
  open,
  onClose,
  title,
  hint,
  pdfFilename = "document.pdf",
  autoAction = null,
  onAutoActionDone,
  saleInvoicePdf = null,
  paymentReceiptPdf = null,
  whatsappPhone = null,
  actions = null,
  children,
}) {
  const receiptRef = useRef(null);
  const { showToast } = useToast();
  const [pdfLoading, setPdfLoading] = useState(false);
  const [whatsappLoading, setWhatsappLoading] = useState(false);

  const hasWhatsApp = Boolean(whatsappPhone?.trim());

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: pdfFilename.replace(/\.pdf$/i, ""),
    pageStyle: A4_PRINT_STYLE,
  });

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      if (saleInvoicePdf?.sale) {
        downloadSaleInvoicePdf(
          saleInvoicePdf.sale,
          saleInvoicePdf.company,
          pdfFilename
        );
        showToast("PDF downloaded", "success");
        return;
      }

      if (paymentReceiptPdf?.receipt) {
        downloadPaymentReceiptPdf(
          paymentReceiptPdf.receipt,
          paymentReceiptPdf.company,
          pdfFilename
        );
        showToast("PDF downloaded", "success");
        return;
      }

      if (!receiptRef.current) {
        showToast("Invoice not ready", "warning");
        return;
      }
      const target = await waitForInvoiceElement(receiptRef.current);
      if (!target) throw new Error("Invoice not found");
      await downloadReceiptPdf(target, pdfFilename, { widthMm: 190 });
      showToast("PDF downloaded", "success");
    } catch (err) {
      console.error("PDF export failed:", err);
      showToast(err?.message || "Could not generate PDF", "error");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleWhatsApp = async () => {
    if (!hasWhatsApp) {
      showToast("No WhatsApp number saved for this account", "warning");
      return;
    }
    if (!receiptRef.current) {
      showToast("Invoice not ready", "warning");
      return;
    }

    setWhatsappLoading(true);
    try {
      await shareInvoiceOnWhatsApp({
        containerEl: receiptRef.current,
        phone: whatsappPhone,
      });
      showToast("Invoice copied — open chat and press Ctrl+V to paste", "success");
    } catch (err) {
      console.error("WhatsApp share failed:", err);
      showToast(err?.message || "Could not share on WhatsApp", "error");
    } finally {
      setWhatsappLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !autoAction) return;
    let cancelled = false;

    const run = async () => {
      if (autoAction === "print") {
        handlePrint();
      } else if (autoAction === "pdf") {
        await handleDownloadPdf();
      }
      if (!cancelled) onAutoActionDone?.();
    };

    const timer = setTimeout(run, 750);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoAction]);

  return (
    <Modal isOpen={open} onClose={onClose} title={title} size="lg">
      <div className="space-y-3">
        {hint && <p className="text-[11px] text-slate-500 px-1">{hint}</p>}

        <div className="flex flex-wrap items-center gap-2 no-print">
          {actions}
          <Button
            type="button"
            onClick={() => handlePrint()}
            className="bg-slate-800 hover:bg-slate-900 border-0 min-h-[40px] text-sm"
          >
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pdfLoading}
            onClick={handleDownloadPdf}
            className="border-slate-200 min-h-[40px] text-sm"
          >
            {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            PDF
          </Button>
          <Button
            type="button"
            disabled={whatsappLoading || !hasWhatsApp}
            onClick={handleWhatsApp}
            title={
              hasWhatsApp
                ? "Copy invoice image and open WhatsApp chat"
                : "Add WhatsApp number on the account to enable"
            }
            className="bg-[#25D366] hover:bg-[#1ebe57] border-0 min-h-[40px] text-sm text-white disabled:opacity-45 disabled:bg-slate-300 disabled:hover:bg-slate-300"
          >
            {whatsappLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MessageCircle className="w-4 h-4" />
            )}
            Share via WhatsApp
          </Button>
        </div>

        <div className="erp-document-print-area rounded-lg border border-slate-200 bg-slate-100/60 p-3 sm:p-4 overflow-y-auto max-h-[min(70vh,720px)]">
          <div ref={receiptRef} className="erp-document-print-root flex justify-center">
            {children}
          </div>
        </div>
      </div>
    </Modal>
  );
}

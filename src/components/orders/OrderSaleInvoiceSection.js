"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/context/ToastContext";
import { SaleInvoicePanel } from "@/components/documents/SaleInvoicePanel";
import { FileText, Loader2, Printer, Download } from "lucide-react";

/**
 * Loads sale + company via /api/orders/:orderId/invoice (staff must own the order).
 * View opens modal with print & PDF; quick actions open the same modal (print/PDF inside).
 */
export function OrderSaleInvoiceSection({ orderId, invoiceNumber, customerName }) {
  const { showToast } = useToast();
  const [sale, setSale] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [autoAction, setAutoAction] = useState(null);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/orders/${orderId}/invoice`);
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) {
          setSale(data.sale);
          setCompany(data.company);
        } else {
          showToast(data.error || "Could not load invoice", "error");
        }
      } catch {
        if (!cancelled) showToast("Error loading invoice", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orderId, showToast]);

  const openInvoice = (action = null) => {
    if (!sale) {
      showToast("Invoice not ready yet", "warning");
      return;
    }
    setAutoAction(action);
    setInvoiceOpen(true);
  };

  if (loading) {
    return (
      <div className="sp-section-card mt-3 flex items-center justify-center gap-2 py-8 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
        <span className="text-sm font-medium">Loading invoice…</span>
      </div>
    );
  }

  if (!sale) return null;

  const label = invoiceNumber || sale.invoiceNumber;

  return (
    <>
      <div className="sp-invoice-card mt-3">
        <div className="flex items-start gap-3">
          <div className="sp-invoice-icon">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Sale invoice</p>
            <p className="text-base font-bold text-slate-900 mt-0.5 font-mono">{label}</p>
            <p className="text-xs text-slate-500 mt-1 truncate">{customerName || sale.customerName}</p>
          </div>
        </div>

        <div className="sp-invoice-actions mt-4">
          <button type="button" onClick={() => openInvoice(null)} className="sp-invoice-btn sp-invoice-btn-primary">
            <FileText className="w-4 h-4" /> View invoice
          </button>
          <button type="button" onClick={() => openInvoice("print")} className="sp-invoice-btn sp-invoice-btn-secondary">
            <Printer className="w-4 h-4" /> Print
          </button>
          <button type="button" onClick={() => openInvoice("pdf")} className="sp-invoice-btn sp-invoice-btn-secondary">
            <Download className="w-4 h-4" /> PDF
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-3 leading-snug">
          Print opens your browser print dialog; PDF saves the invoice file to your device.
        </p>
      </div>

      <SaleInvoicePanel
        sale={sale}
        company={company}
        open={invoiceOpen}
        onClose={() => {
          setInvoiceOpen(false);
          setAutoAction(null);
        }}
        title={`Invoice ${label}`}
        autoAction={autoAction}
        onAutoActionDone={() => setAutoAction(null)}
      />
    </>
  );
}

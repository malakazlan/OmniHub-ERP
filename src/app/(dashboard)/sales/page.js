"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { SaleInvoicePanel } from "@/components/documents/SaleInvoicePanel";
import SalesListView from "@/components/sales/SalesListView";
import { Loader2 } from "lucide-react";

function SalesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [invoiceSale, setInvoiceSale] = useState(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [companySettings, setCompanySettings] = useState(null);

  const openInvoice = useCallback(async (id) => {
    if (!id) return;
    try {
      const res = await fetch(`/api/sales/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load invoice");
      setInvoiceSale(data.sale);
      setInvoiceOpen(true);
    } catch (err) {
      showToast(err.message || "Could not open invoice", "error");
    }
  }, [showToast]);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sales");
      const data = await res.json();
      if (res.ok) setSales(data.sales || []);
      else showToast(data.error || "Failed to load sales", "error");
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => { if (d.settings) setCompanySettings(d.settings); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const invoiceId = searchParams.get("invoice");
    if (!invoiceId) return;
    openInvoice(invoiceId);
    router.replace("/sales", { scroll: false });
  }, [searchParams, openInvoice, router]);

  return (
    <>
      <SalesListView sales={sales} loading={loading} onOpenInvoice={openInvoice} />

      <SaleInvoicePanel
        sale={invoiceSale}
        company={companySettings}
        open={invoiceOpen}
        onClose={() => { setInvoiceOpen(false); setInvoiceSale(null); }}
      />
    </>
  );
}

export default function SalesPage() {
  return (
    <Suspense
      fallback={
        <div className="h-48 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-acc-sales animate-spin" />
        </div>
      }
    >
      <SalesPageContent />
    </Suspense>
  );
}

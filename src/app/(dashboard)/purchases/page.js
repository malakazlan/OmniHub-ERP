"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { PurchasePayModal } from "@/components/purchases/PurchasePayModal";
import { PurchaseReceiptPanel } from "@/components/documents/PurchaseReceiptPanel";
import PurchaseListView from "@/components/purchases/PurchaseListView";
import { Loader2 } from "lucide-react";

function PurchasesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payPurchase, setPayPurchase] = useState(null);
  const [receiptPurchase, setReceiptPurchase] = useState(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [companySettings, setCompanySettings] = useState(null);

  const openBill = useCallback(async (id) => {
    if (!id) return;
    try {
      const res = await fetch(`/api/purchases/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load bill");
      setReceiptPurchase(data.purchase);
      setReceiptOpen(true);
    } catch (err) {
      showToast(err.message || "Could not open bill", "error");
    }
  }, [showToast]);

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/purchases");
      const data = await res.json();
      if (res.ok) setPurchases(data.purchases || []);
      else showToast(data.error || "Failed to load purchases", "error");
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => { if (d.settings) setCompanySettings(d.settings); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const billId = searchParams.get("bill");
    if (!billId) return;
    openBill(billId);
    router.replace("/purchases", { scroll: false });
  }, [searchParams, openBill, router]);

  return (
    <>
      <PurchaseListView
        purchases={purchases}
        loading={loading}
        onOpenBill={openBill}
        onPay={setPayPurchase}
        onRefresh={fetchPurchases}
      />

      <PurchasePayModal
        purchase={payPurchase}
        open={Boolean(payPurchase)}
        onClose={() => setPayPurchase(null)}
        onPaid={() => fetchPurchases()}
      />

      <PurchaseReceiptPanel
        purchase={receiptPurchase}
        company={companySettings}
        open={receiptOpen}
        onClose={() => { setReceiptOpen(false); setReceiptPurchase(null); }}
        title="Vendor bill"
      />
    </>
  );
}

export default function PurchasesPage() {
  return (
    <Suspense
      fallback={
        <div className="h-48 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-acc-purchases animate-spin" />
        </div>
      }
    >
      <PurchasesPageContent />
    </Suspense>
  );
}

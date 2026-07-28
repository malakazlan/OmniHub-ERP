"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { mustScopeOrdersToSelf } from "@/lib/ordersNav";
import { useToast } from "@/context/ToastContext";
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Trash2,
  Package,
  XCircle,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { OrderSaleInvoiceSection } from "@/components/orders/OrderSaleInvoiceSection";

const STATUS_MSG = {
  pending: "Waiting for admin to review this order.",
  accepted: "Approved — admin will create the sale invoice.",
  rejected: "This order was not approved.",
  converted: "This order was invoiced. View, print, or download the invoice below.",
};

export default function MyOrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authLoading && user && !mustScopeOrdersToSelf(user)) {
      router.replace(`/orders/${id}`);
    }
  }, [authLoading, user, router, id]);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${id}`);
      const data = await res.json();
      if (res.ok) setOrder(data.order);
      else showToast(data.error || "Not found", "error");
    } catch {
      showToast("Error loading order", "error");
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    if (authLoading || !user || !mustScopeOrdersToSelf(user)) return;
    load();
  }, [load, authLoading, user]);

  const canModify =
    order &&
    (order.status === "pending" || order.status === "accepted") &&
    !order.saleOrderId;

  const handleDelete = async () => {
    if (!window.confirm("Delete this order?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast("Order deleted", "success");
        router.push("/orders/my");
      } else showToast(data.error || "Delete failed", "error");
    } finally {
      setBusy(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-9 h-9 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20 px-6">
        <p className="text-slate-600">Order not found.</p>
        <Link href="/orders/my" className="sp-text-link mt-4 inline-block">Back to my orders</Link>
      </div>
    );
  }

  const customer = order.shop?.name || order.company?.name || order.customerName;

  return (
    <div className="page-enter max-w-lg mx-auto pb-28">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/orders/my" className="sp-back-btn" aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">{order.orderNumber}</p>
          <h1 className="text-xl font-bold text-slate-900 truncate">{customer}</h1>
        </div>
      </div>

      <div className="sp-detail-banner">
        <p className="text-sm font-medium text-slate-800">{STATUS_MSG[order.status] || order.status}</p>
        {order.rejectionReason && (
          <p className="text-sm text-red-700 mt-2 flex gap-2 items-start">
            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {order.rejectionReason}
          </p>
        )}
        {order.saleOrder?.invoiceNumber && order.status !== "converted" && (
          <p className="text-xs text-emerald-700 font-semibold mt-2">
            Invoice {order.saleOrder.invoiceNumber}
          </p>
        )}
      </div>

      {order.saleOrder?.id && (
        <OrderSaleInvoiceSection
          orderId={order.id}
          invoiceNumber={order.saleOrder.invoiceNumber}
          customerName={customer}
        />
      )}

      <div className="sp-section-card mt-4">
        <p className="sp-section-title">Summary</p>
        <dl className="grid grid-cols-2 gap-3 text-sm mt-3">
          <div>
            <dt className="text-slate-500 text-xs">Date</dt>
            <dd className="font-semibold text-slate-900">{formatDate(order.orderDate)}</dd>
          </div>
          <div className="text-right">
            <dt className="text-slate-500 text-xs">Total</dt>
            <dd className="font-bold text-orange-700 text-lg">{formatCurrency(order.totalAmount)}</dd>
          </div>
        </dl>
      </div>

      <div className="sp-section-card mt-3">
        <p className="sp-section-title flex items-center gap-2">
          <Package className="w-4 h-4 text-orange-500" /> Items
        </p>
        <ul className="mt-3 space-y-3">
          {(order.items || []).map((line) => (
            <li key={line.id} className="flex justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 text-sm">{line.productName}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {line.quantity} {line.unit} × {formatCurrency(line.rate)}
                </p>
              </div>
              <p className="font-mono text-sm font-bold text-slate-800 shrink-0">{formatCurrency(line.amount)}</p>
            </li>
          ))}
        </ul>
      </div>

      {order.notes && (
        <div className="sp-section-card mt-3">
          <p className="sp-section-title">Notes</p>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">{order.notes}</p>
        </div>
      )}

      {canModify && (
        <div className="fixed bottom-0 left-0 right-0 z-20 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-none">
          <div className="max-w-lg mx-auto flex gap-2 pointer-events-auto">
            <Link href={`/orders/my/${id}/edit`} className="sp-action-btn sp-action-secondary flex-1">
              <Pencil className="w-4 h-4" /> Edit
            </Link>
            <button
              type="button"
              disabled={busy}
              onClick={handleDelete}
              className="sp-action-btn sp-action-danger flex-1"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

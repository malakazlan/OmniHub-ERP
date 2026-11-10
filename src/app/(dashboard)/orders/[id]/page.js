"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { mustScopeOrdersToSelf } from "@/lib/ordersNav";
import { useToast } from "@/context/ToastContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/Button";
import {
  ClipboardList,
  Loader2,
  CheckCircle2,
  XCircle,
  Trash2,
  Pencil,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

const STATUS_VARIANT = {
  pending: "warning",
  accepted: "success",
  rejected: "danger",
  converted: "indigo",
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const isAdmin = user?.role === "admin" || user?.role === "manager";

  useEffect(() => {
    if (!authLoading && user && mustScopeOrdersToSelf(user)) {
      router.replace(`/orders/my/${id}`);
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
    if (authLoading || !user || mustScopeOrdersToSelf(user)) return;
    load();
  }, [load, authLoading, user]);

  const runAction = async (action, extra = {}) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (res.ok) {
        if (action === "convert" && data.redirectUrl) {
          router.push(data.redirectUrl);
          return;
        }
        showToast("Updated", "success");
        setOrder(data.order);
        load();
      } else showToast(data.error || "Action failed", "error");
    } catch {
      showToast("Request failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this order?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast("Order deleted", "success");
        router.push("/orders");
      } else showToast(data.error || "Delete failed", "error");
    } finally {
      setBusy(false);
    }
  };

  if (loading || authLoading || (user && mustScopeOrdersToSelf(user))) {
    return (
      <div className="h-72 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-16 text-slate-600">
        Order not found.{" "}
        <Link href="/orders" className="text-orange-700 font-semibold hover:underline">
          Back to queue
        </Link>
      </div>
    );
  }

  const canModify =
    (order.status === "pending" || order.status === "accepted") &&
    !order.saleOrderId &&
    (isAdmin || order.createdById === user?.id);
  const showReview = isAdmin && order.status === "pending";
  const showConvert = isAdmin && order.status === "accepted" && !order.saleOrderId;
  const hasActions = showReview || showConvert || canModify;

  return (
    <div className="erp-orders-page space-y-6 page-enter pb-8">
      <PageHeader
        module="orders"
        title={order.orderNumber}
        description={`${order.customerName} · ${formatDate(order.orderDate)}`}
        icon={ClipboardList}
        breadcrumbs={[{ label: "Sales Orders", href: "/orders" }, { label: order.orderNumber }]}
        actions={
          <Link href="/orders">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4" /> Back to queue
            </Button>
          </Link>
        }
      />

      <div className="erp-doc-section">
        <div className="erp-doc-section-head">
          <div>
            <p className="erp-doc-section-title">Order summary</p>
            <div className="erp-orders-meta-strip mt-2">
              <Badge variant={STATUS_VARIANT[order.status] || "neutral"} className="capitalize">
                {order.status}
              </Badge>
              {order.createdBy && <span>Created by {order.createdBy.name}</span>}
              {order.saleOrder && (
                <Link
                  href={`/sales/${order.saleOrder.id}`}
                  className="text-green-700 font-semibold hover:underline"
                >
                  Invoice {order.saleOrder.invoiceNumber}
                </Link>
              )}
            </div>
          </div>
        </div>

        {order.rejectionReason && (
          <div className="px-4 sm:px-5 py-3 text-sm text-red-800 bg-red-50 border-b border-red-100">
            Rejected: {order.rejectionReason}
          </div>
        )}

        {hasActions && (
          <div className="erp-doc-actions">
            {showReview && (
              <>
                <Button disabled={busy} variant="brand" onClick={() => runAction("accept")}>
                  <CheckCircle2 className="w-4 h-4" /> Accept
                </Button>
                <Button
                  disabled={busy}
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                  onClick={() => {
                    const reason = window.prompt("Rejection reason (optional)") || "";
                    runAction("reject", { reason });
                  }}
                >
                  <XCircle className="w-4 h-4" /> Reject
                </Button>
              </>
            )}
            {showConvert && (
              <Button disabled={busy} variant="brand" onClick={() => runAction("convert")}>
                <ArrowRight className="w-4 h-4" /> Convert to sale
              </Button>
            )}
            {canModify && (
              <>
                <Link href={`/orders/${id}/edit`}>
                  <Button variant="outline">
                    <Pencil className="w-4 h-4" /> Edit
                  </Button>
                </Link>
                <Button
                  disabled={busy}
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                  onClick={handleDelete}
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </Button>
              </>
            )}
          </div>
        )}

        <div className="erp-doc-body">
          <div className="overflow-x-auto rounded-lg border border-orange-100/80">
            <table className="erp-line-table w-full min-w-[480px]">
              <thead>
                <tr>
                  <th className="text-left">Item</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Rate</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(order.items || []).map((line) => (
                  <tr key={line.id} className="erp-data-row">
                    <td className="font-medium text-slate-900">{line.productName}</td>
                    <td className="text-right">
                      <span className="erp-money erp-money-muted">
                        {line.quantity} {line.unit}
                      </span>
                    </td>
                    <td className="text-right">
                      <span className="erp-money">{formatCurrency(line.rate)}</span>
                    </td>
                    <td className="text-right">
                      <span className="erp-money erp-money-strong">{formatCurrency(line.amount)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 max-w-xs ml-auto erp-summary-block">
            <div className="erp-summary-block-title">Totals</div>
            <div className="erp-summary-row">
              <span>Subtotal</span>
              <span className="erp-money">{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="erp-summary-row erp-summary-row-grand">
              <span className="font-semibold text-slate-800">Total</span>
              <span className="erp-money">{formatCurrency(order.totalAmount)}</span>
            </div>
          </div>

          {order.notes && (
            <div className="mt-5 pt-4 border-t border-orange-100">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Notes</p>
              <p className="text-sm text-slate-700 leading-relaxed">{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

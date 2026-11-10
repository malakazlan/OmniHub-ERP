"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/Button";
import {
  ShoppingCart,
  Loader2,
  ArrowLeft,
  User,
  Package,
  CreditCard,
  Truck,
  FileText,
  Undo2,
  CheckCircle2,
  Pencil,
  Trash2,
  Wallet,
  FilePenLine,
} from "lucide-react";
import { formatCurrency, formatDate, formatDateTime, formatQuantity, parseNumber } from "@/lib/formatters";
import {
  computeMaxReturnableQuantity,
  computeMaxReturnRefundBeforeReturn,
} from "@/lib/purchaseReturn";
import { PurchaseReceiptPanel } from "@/components/documents/PurchaseReceiptPanel";
import { PurchasePayModal } from "@/components/purchases/PurchasePayModal";
import { useDefaultCashAccountId } from "@/hooks/useDefaultCashAccount";

const STATUS_VARIANTS = {
  draft: "neutral",
  confirmed: "info",
  received: "success",
  cancelled: "danger",
};

const PAYMENT_VARIANTS = {
  unpaid: "danger",
  partial: "warning",
  paid: "success",
};

function DetailRow({ label, value, mono = false }) {
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <span className={`text-xs font-semibold text-slate-900 text-right ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}

export default function PurchaseDetailPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const defaultCashAccountId = useDefaultCashAccountId();
  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companySettings, setCompanySettings] = useState(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [returns, setReturns] = useState([]);
  const [returnModal, setReturnModal] = useState(false);
  const [returnLines, setReturnLines] = useState([]);
  const [returnMeta, setReturnMeta] = useState({ returnDate: "", reason: "", notes: "" });
  const [returnRefund, setReturnRefund] = useState({
    cashAmount: "",
    bankAmount: "",
    cashAccountId: "",
    bankAccountId: "",
  });
  const [returnAccounts, setReturnAccounts] = useState([]);
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [correctionMeta, setCorrectionMeta] = useState(null);

  const fetchPurchase = async () => {
    try {
      const res = await fetch(`/api/purchases/${id}`);
      const data = await res.json();
      if (res.ok) {
        const po = data.purchase || data;
        setPurchase(data.purchase || data);
        if (
          po.status !== "draft" &&
          (parseFloat(po.cashAmount) > 0 || parseFloat(po.bankAmount) > 0)
        ) {
          fetch(`/api/purchases/${id}/sync-ledger`, { method: "POST" })
            .then((r) => r.json())
            .then((sync) => {
              if (sync.success && sync.purchase) setPurchase(sync.purchase);
            })
            .catch(() => {});
        }
      } else {
        showToast(data.error || "Failed to load purchase", "error");
      }
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchReturns = async () => {
    try {
      const res = await fetch(`/api/purchases/${id}/returns`);
      const data = await res.json();
      if (res.ok) setReturns(data.returns || []);
    } catch {
      /* ignore */
    }
  };

  const fetchCorrectionMeta = async () => {
    try {
      const res = await fetch(`/api/purchases/${id}/correct`);
      const data = await res.json();
      if (res.ok) setCorrectionMeta(data);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (id) {
      fetchPurchase();
      fetchReturns();
      fetchCorrectionMeta();
    }
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) setCompanySettings(d.settings);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!purchase || loading) return;
    if (searchParams.get("bill") === "1") {
      setReceiptOpen(true);
      router.replace(`/purchases/${id}`, { scroll: false });
    }
  }, [purchase, loading, searchParams, id, router]);

  const handleConfirmDraft = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/purchases/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "confirmed" }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Purchase confirmed — stock and ledger updated", "success");
        setPurchase(data.purchase);
      } else {
        showToast(data.error || "Could not confirm", "error");
      }
    } catch {
      showToast("Error confirming purchase", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteDraft = async () => {
    if (!window.confirm("Delete this draft purchase? This cannot be undone.")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/purchases/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast("Draft deleted", "success");
        router.push("/purchases");
      } else {
        showToast(data.error || "Could not delete", "error");
      }
    } catch {
      showToast("Error deleting purchase", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const openReturnModal = () => {
    const returnedByProduct = {};
    for (const record of returns) {
      for (const item of record.items || []) {
        returnedByProduct[item.productId] =
          (returnedByProduct[item.productId] || 0) + (item.quantity || 0);
      }
    }

    const lines = (purchase?.items || [])
      .map((item) => {
        const alreadyReturned = returnedByProduct[item.productId] || 0;
        const inStock = item.product?.currentStock ?? 0;
        const maxQty = computeMaxReturnableQuantity(item.quantity, alreadyReturned, inStock);
        return {
          productId: item.productId,
          productName: item.productName,
          unit: item.unit,
          rate: item.rate,
          purchasedQty: item.quantity,
          alreadyReturned,
          inStock,
          maxQty,
          quantity: 0,
          selected: false,
        };
      })
      .filter((line) => line.purchasedQty - line.alreadyReturned > 0);

    if (lines.every((line) => line.maxQty <= 0)) {
      showToast(
        "Nothing available to return — items are either fully returned or not in stock",
        "warning"
      );
      return;
    }

    setReturnLines(lines);
    setReturnMeta({ returnDate: new Date().toISOString().slice(0, 10), reason: "", notes: "" });
    setReturnRefund({
      cashAmount: "",
      bankAmount: "",
      cashAccountId: purchase?.cashAccountId
        ? String(purchase.cashAccountId)
        : defaultCashAccountId || "",
      bankAccountId: "",
    });
    setReturnModal(true);
  };

  useEffect(() => {
    if (!returnModal) return;
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((d) => {
        if (d.accounts) setReturnAccounts(d.accounts.filter((a) => a.isActive));
      })
      .catch(() => {});
  }, [returnModal]);

  const updateReturnLine = (idx, field, value) => {
    setReturnLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  };

  const handleSubmitReturn = async (e) => {
    e.preventDefault();
    const items = returnLines
      .filter((l) => l.selected && parseFloat(l.quantity) > 0)
      .map((l) => ({
        productId: l.productId,
        productName: l.productName,
        unit: l.unit,
        rate: l.rate,
        quantity: parseFloat(l.quantity),
      }));

    if (items.length === 0) {
      showToast("Select at least one item with a quantity to return", "warning");
      return;
    }

    const refundCashAmount = parseNumber(returnRefund.cashAmount);
    const refundBankAmount = parseNumber(returnRefund.bankAmount);
    const refundTotal = refundCashAmount + refundBankAmount;
    const returnValue = items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
    const maxRefund = computeMaxReturnRefundBeforeReturn(purchase, returnValue);
    if (refundTotal > maxRefund + 0.01) {
      showToast(
        maxRefund <= 0
          ? "No refund available — nothing overpaid on this bill"
          : `Refund cannot exceed ${formatCurrency(maxRefund)}`,
        "warning"
      );
      return;
    }

    setSubmittingReturn(true);
    try {
      const res = await fetch(`/api/purchases/${id}/returns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...returnMeta,
          items,
          refundCashAmount,
          refundBankAmount,
          refundCashAccountId: returnRefund.cashAccountId || undefined,
          refundBankAccountId: returnRefund.bankAccountId || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Return ${data.return?.returnNumber || ""} recorded!`, "success");
        setReturnModal(false);
        if (data.purchase) setPurchase((prev) => ({ ...prev, ...data.purchase }));
        fetchPurchase();
        fetchReturns();
        fetchCorrectionMeta();
      } else {
        showToast(data.error || "Failed to record return", "error");
      }
    } catch {
      showToast("Error processing request", "error");
    } finally {
      setSubmittingReturn(false);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center page-enter">
        <Loader2 className="w-8 h-8 text-acc-purchases animate-spin" />
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="page-enter space-y-6">
        <PageHeader
          module="purchases"
          title="Bill Not Found"
          icon={ShoppingCart}
          breadcrumbs={[
            { label: "Purchase Orders", href: "/purchases" },
            { label: "Not Found" },
          ]}
        />
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500 mb-4">This purchase order could not be found.</p>
            <Link href="/purchases">
              <Button variant="outline" className="border-slate-200 text-slate-700">
                <ArrowLeft className="w-4 h-4" /> Back to Purchases
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const balanceDue = Math.max((purchase.totalAmount || 0) - (purchase.paidAmount || 0), 0);
  const totalReturned =
    purchase.totalReturned ?? returns.reduce((s, r) => s + (r.returnAmount || 0), 0);
  const canReturn = purchase.status === "confirmed" || purchase.status === "received";
  const isDraft = purchase.status === "draft";
  const isConfirmed = purchase.status === "confirmed" || purchase.status === "received";
  const canPay = isConfirmed && balanceDue > 0;

  const selectedReturnAmount = returnLines
    .filter((line) => line.selected && parseFloat(line.quantity) > 0)
    .reduce((sum, line) => sum + parseFloat(line.quantity) * parseFloat(line.rate || 0), 0);
  const maxReturnRefund = computeMaxReturnRefundBeforeReturn(purchase, selectedReturnAmount);
  const returnCashAccounts = returnAccounts.filter((account) => account.category === "cash");
  const returnBankAccounts = returnAccounts.filter((account) => account.category === "bank");

  return (
    <div className="space-y-5 page-enter pb-10">
      <PageHeader
        module="purchases"
        title={purchase.purchaseNumber}
        description={purchase.vendorName}
        icon={ShoppingCart}
        breadcrumbs={[
          { label: "Purchase Orders", href: "/purchases" },
          { label: purchase.purchaseNumber },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap no-print">
            <Badge variant={STATUS_VARIANTS[purchase.status] || "neutral"}>{purchase.status}</Badge>
            <Badge variant={PAYMENT_VARIANTS[purchase.paymentStatus] || "neutral"}>
              {purchase.paymentStatus}
            </Badge>
            <Link href="/purchases">
              <Button variant="outline" className="border-slate-200 text-slate-700">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            </Link>
          </div>
        }
      />

      {/* Workflow strip */}
      <Card className="border-slate-200/90 shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="grid grid-cols-3 gap-2 sm:gap-4 flex-1 max-w-xl">
              {[
                { step: "1", label: "Draft", done: !isDraft, active: isDraft },
                { step: "2", label: "Confirmed", done: isConfirmed, active: !isDraft && !isConfirmed },
                { step: "3", label: "Settled", done: purchase.paymentStatus === "paid", active: isConfirmed && purchase.paymentStatus !== "paid" },
              ].map((s) => (
                <div
                  key={s.step}
                  className={`rounded-lg px-3 py-2 border text-center ${
                    s.done
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : s.active
                        ? "bg-blue-50 border-blue-200 text-blue-800"
                        : "bg-slate-50 border-slate-200 text-slate-500"
                  }`}
                >
                  <p className="text-[10px] font-bold uppercase">Step {s.step}</p>
                  <p className="text-xs font-semibold">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {isDraft && (
                <>
                  <Link href={`/purchases/new?edit=${id}`}>
                    <Button variant="outline" className="border-slate-200 min-h-[40px]">
                      <Pencil className="w-4 h-4" /> Edit draft
                    </Button>
                  </Link>
                  <Button
                    disabled={actionLoading}
                    onClick={handleConfirmDraft}
                    className="bg-blue-600 hover:bg-blue-700 border-0 min-h-[40px]"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Confirm order
                  </Button>
                  <Button
                    disabled={actionLoading}
                    variant="outline"
                    onClick={handleDeleteDraft}
                    className="border-red-200 text-red-700 hover:bg-red-50 min-h-[40px]"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </Button>
                </>
              )}
              {canPay && (
                <Button
                  onClick={() => setPayOpen(true)}
                  className="bg-teal-700 hover:bg-teal-800 border-0 min-h-[40px]"
                >
                  <Wallet className="w-4 h-4" /> Pay {formatCurrency(balanceDue)}
                </Button>
              )}
              {isConfirmed && (
                <Button
                  variant="outline"
                  onClick={() => setReceiptOpen(true)}
                  className="border-slate-200 min-h-[40px]"
                >
                  <FileText className="w-4 h-4" /> Print bill
                </Button>
              )}
              {isConfirmed && correctionMeta?.canCorrect && (
                <Link href={`/purchases/new?correct=${id}`}>
                  <Button variant="outline" className="border-amber-200 text-amber-900 bg-amber-50/60 min-h-[40px]">
                    <FilePenLine className="w-4 h-4" /> Correct bill
                  </Button>
                </Link>
              )}
              {canReturn && (
                <Button onClick={openReturnModal} variant="outline" className="border-slate-200 min-h-[40px]">
                  <Undo2 className="w-4 h-4" /> Return
                </Button>
              )}
            </div>
          </div>

          {isDraft && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-4">
              Draft — inventory and supplier ledger are <strong>not</strong> updated until you confirm.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Payment summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] uppercase font-semibold text-slate-500">Total</p>
            <p className="font-mono font-bold text-slate-900 mt-1">{formatCurrency(purchase.totalAmount)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] uppercase font-semibold text-slate-500">Paid</p>
            <p className="font-mono font-bold text-emerald-700 mt-1">{formatCurrency(purchase.paidAmount)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] uppercase font-semibold text-slate-500">Balance</p>
            <p className={`font-mono font-bold mt-1 ${balanceDue > 0 ? "text-blue-600" : "text-slate-400"}`}>
              {formatCurrency(balanceDue)}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] uppercase font-semibold text-slate-500">Date</p>
            <p className="text-sm font-semibold text-slate-900 mt-1">{formatDate(purchase.purchaseDate)}</p>
          </CardContent>
        </Card>
      </div>

      <PurchasePayModal
        purchase={purchase}
        open={payOpen}
        onClose={() => setPayOpen(false)}
        onPaid={(updated) => setPurchase(updated)}
      />

      <PurchaseReceiptPanel
        purchase={purchase}
        company={companySettings}
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          {/* Line Items */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-acc-purchases" /> Line Items
              </h2>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="px-5 py-3">Item</th>
                      <th className="px-5 py-3">Qty</th>
                      <th className="px-5 py-3">Rate</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(purchase.items || []).map((item, i) => (
                      <tr key={item.id || i} className="text-sm">
                        <td className="px-5 py-3 font-semibold text-slate-900">{item.productName}</td>
                        <td className="px-5 py-3 text-slate-600">
                          {formatQuantity(item.quantity, item.unit)}
                        </td>
                        <td className="px-5 py-3 font-mono text-slate-600">{formatCurrency(item.rate)}</td>
                        <td className="px-5 py-3 font-mono font-bold text-slate-900 text-right">
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))}
                    {(!purchase.items || purchase.items.length === 0) && (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-slate-500 text-sm">
                          No line items recorded
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Returns */}
          {returns.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Undo2 className="w-4 h-4 text-acc-purchases" /> Returns
                </h2>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="px-5 py-3">Return No.</th>
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3">Reason</th>
                        <th className="px-5 py-3 text-right">Return</th>
                        <th className="px-5 py-3 text-right">Refund</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {returns.map((r) => {
                        const refundTotal =
                          (r.refundCashAmount || 0) + (r.refundBankAmount || 0);
                        return (
                        <tr key={r.id} className="text-sm">
                          <td className="px-5 py-3 font-mono font-bold text-slate-900">{r.returnNumber}</td>
                          <td className="px-5 py-3 text-slate-600">{formatDate(r.returnDate)}</td>
                          <td className="px-5 py-3 text-slate-600">{r.reason || "—"}</td>
                          <td className="px-5 py-3 font-mono font-bold text-red-600 text-right">
                            {formatCurrency(r.returnAmount)}
                          </td>
                          <td className="px-5 py-3 font-mono font-bold text-emerald-700 text-right">
                            {refundTotal > 0 ? formatCurrency(refundTotal) : "—"}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {purchase.notes && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-acc-purchases" /> Notes
                </h2>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{purchase.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {/* Vendor Info */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-acc-purchases" /> Vendor
              </h2>
            </CardHeader>
            <CardContent>
              <DetailRow label="Name" value={purchase.vendorName} />
              <DetailRow label="Type" value={purchase.farmerId ? "Farmer (legacy)" : purchase.companyId ? "Vendor" : "—"} />
              <DetailRow label="Date" value={formatDate(purchase.purchaseDate)} />
              {purchase.createdAt && (
                <DetailRow label="Created" value={formatDateTime(purchase.createdAt)} />
              )}
            </CardContent>
          </Card>

          {/* Costs */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-acc-purchases" /> Amount breakdown
              </h2>
            </CardHeader>
            <CardContent>
              <DetailRow label="Subtotal" value={formatCurrency(purchase.subtotal)} mono />
              <DetailRow label="Transport" value={formatCurrency(purchase.transportCost)} mono />
              <DetailRow label="Loading" value={formatCurrency(purchase.loadingCost)} mono />
              <DetailRow label="Labour" value={formatCurrency(purchase.labourCost)} mono />
              <DetailRow label="Tax" value={formatCurrency(purchase.taxAmount)} mono />
              <DetailRow label="Discount" value={formatCurrency(purchase.discountAmount)} mono />
              {totalReturned > 0 && (
                <DetailRow label="Returns" value={`− ${formatCurrency(totalReturned)}`} mono />
              )}
              <div className="flex justify-between items-center pt-3 mt-2 border-t border-slate-200">
                <span className="text-sm font-bold text-slate-900">
                  {totalReturned > 0 ? "Net Total" : "Grand Total"}
                </span>
                <span className="font-mono font-black text-acc-purchases text-lg">
                  {formatCurrency(purchase.totalAmount)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-acc-purchases" /> Payment
              </h2>
            </CardHeader>
            <CardContent>
              <DetailRow label="Cash" value={formatCurrency(purchase.cashAmount)} mono />
              <DetailRow label="Bank" value={formatCurrency(purchase.bankAmount)} mono />
              <DetailRow label="Paid Total" value={formatCurrency(purchase.paidAmount)} mono />
              <div className="flex justify-between items-center pt-3 mt-2 border-t border-slate-200">
                <span className="text-xs font-semibold text-slate-500">Balance Due</span>
                <span className="font-mono font-bold text-blue-700">{formatCurrency(balanceDue)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Transport */}
          {(purchase.vehicleNumber || purchase.driverName) && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-acc-purchases" /> Transport
                </h2>
              </CardHeader>
              <CardContent>
                {purchase.vehicleNumber && <DetailRow label="Vehicle" value={purchase.vehicleNumber} />}
                {purchase.driverName && <DetailRow label="Driver" value={purchase.driverName} />}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Modal
        isOpen={returnModal}
        onClose={() => setReturnModal(false)}
        title="Record Purchase Return"
        size="lg"
      >
        <form onSubmit={handleSubmitReturn} className="space-y-4">
          <p className="text-xs text-slate-500">
            Select items being returned to <span className="font-semibold text-slate-900">{purchase.vendorName}</span> for purchase{" "}
            <span className="font-mono font-bold text-slate-900">{purchase.purchaseNumber}</span>.
            Return quantity is limited by what is still on this bill and current stock on hand.
          </p>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-3 py-2 w-8"></th>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Purchased</th>
                  <th className="px-3 py-2">Returned</th>
                  <th className="px-3 py-2">In Stock</th>
                  <th className="px-3 py-2 w-28">Return Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {returnLines.map((line, idx) => (
                  <tr key={line.productId} className="text-xs">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={line.selected}
                        disabled={line.maxQty <= 0}
                        onChange={(e) => updateReturnLine(idx, "selected", e.target.checked)}
                        className="rounded border-slate-300 disabled:opacity-40"
                      />
                    </td>
                    <td className="px-3 py-2 font-semibold text-slate-900">{line.productName}</td>
                    <td className="px-3 py-2 text-slate-500">{formatQuantity(line.purchasedQty, line.unit)}</td>
                    <td className="px-3 py-2 text-slate-500">{formatQuantity(line.alreadyReturned, line.unit)}</td>
                    <td className="px-3 py-2 text-slate-500">{formatQuantity(line.inStock, line.unit)}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        max={line.maxQty}
                        step="any"
                        disabled={!line.selected || line.maxQty <= 0}
                        value={line.quantity}
                        onChange={(e) => updateReturnLine(idx, "quantity", e.target.value)}
                        className="input-field py-1 px-2 text-xs disabled:opacity-40"
                        title={
                          line.maxQty <= 0
                            ? "No stock available to return"
                            : `Max returnable: ${line.maxQty}`
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Return Date</label>
              <input
                type="date"
                value={returnMeta.returnDate}
                onChange={(e) => setReturnMeta({ ...returnMeta, returnDate: e.target.value })}
                className="input-field"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Reason</label>
              <input
                type="text"
                value={returnMeta.reason}
                onChange={(e) => setReturnMeta({ ...returnMeta, reason: e.target.value })}
                className="input-field"
                placeholder="e.g. Damaged / excess quantity"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Notes</label>
            <textarea
              value={returnMeta.notes}
              onChange={(e) => setReturnMeta({ ...returnMeta, notes: e.target.value })}
              className="input-field h-16 resize-none"
            />
          </div>

          {(purchase.paidAmount || 0) > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-emerald-900 flex items-center gap-2">
                    <Wallet className="w-4 h-4" /> Refund received from supplier
                  </p>
                  <p className="text-[11px] text-emerald-800 mt-1">
                    Optional — record cash/bank received if the supplier pays back money on this return.
                  </p>
                </div>
                {maxReturnRefund > 0 && selectedReturnAmount > 0 && (
                  <span className="text-[11px] font-semibold text-emerald-800 whitespace-nowrap">
                    Max refund: {formatCurrency(maxReturnRefund)}
                  </span>
                )}
              </div>

              {selectedReturnAmount > 0 && maxReturnRefund <= 0 ? (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  No refund available for this return — the bill is not overpaid yet.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase text-emerald-800">Cash received</label>
                      <input
                        type="number"
                        min="0"
                        max={maxReturnRefund}
                        step="any"
                        value={returnRefund.cashAmount}
                        onChange={(e) =>
                          setReturnRefund({ ...returnRefund, cashAmount: e.target.value })
                        }
                        className="input-field w-full"
                        placeholder="0"
                        disabled={maxReturnRefund <= 0}
                      />
                      {parseNumber(returnRefund.cashAmount) > 0 && returnCashAccounts.length > 0 && (
                        <select
                          value={returnRefund.cashAccountId}
                          onChange={(e) =>
                            setReturnRefund({ ...returnRefund, cashAccountId: e.target.value })
                          }
                          className="input-field w-full text-xs"
                        >
                          <option value="">Cash account…</option>
                          {returnCashAccounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase text-emerald-800">Bank received</label>
                      <input
                        type="number"
                        min="0"
                        max={maxReturnRefund}
                        step="any"
                        value={returnRefund.bankAmount}
                        onChange={(e) =>
                          setReturnRefund({ ...returnRefund, bankAmount: e.target.value })
                        }
                        className="input-field w-full"
                        placeholder="0"
                        disabled={maxReturnRefund <= 0}
                      />
                      {parseNumber(returnRefund.bankAmount) > 0 && returnBankAccounts.length > 0 && (
                        <select
                          value={returnRefund.bankAccountId}
                          onChange={(e) =>
                            setReturnRefund({ ...returnRefund, bankAccountId: e.target.value })
                          }
                          className="input-field w-full text-xs"
                        >
                          <option value="">Bank account…</option>
                          {returnBankAccounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                  {maxReturnRefund > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setReturnRefund((prev) => ({
                          ...prev,
                          cashAmount: String(maxReturnRefund),
                          bankAmount: "",
                        }))
                      }
                      className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 cursor-pointer"
                    >
                      Fill max refund ({formatCurrency(maxReturnRefund)})
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setReturnModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 border border-slate-200 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <Button type="submit" disabled={submittingReturn} className="bg-acc-purchases hover:bg-blue-700 border-0">
              {submittingReturn ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />}
              Record Return
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

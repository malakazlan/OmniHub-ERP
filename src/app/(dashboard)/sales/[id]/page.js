"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/Button";
import {
  DollarSign,
  Loader2,
  ArrowLeft,
  User,
  Package,
  CreditCard,
  Truck,
  FileText,
  Undo2,
  FilePenLine,
} from "lucide-react";
import { formatCurrency, formatDate, formatDateTime, formatQuantity } from "@/lib/formatters";
import { resolveSalePayment } from "@/lib/salePayment";
import { buildInvoiceLineItems } from "@/lib/saleReturn";
import { SaleInvoicePanel, SaleInvoicePreviewCard } from "@/components/documents/SaleInvoicePanel";

const STATUS_VARIANTS = {
  draft: "neutral",
  confirmed: "info",
  dispatched: "warning",
  delivered: "success",
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

export default function SaleDetailPage() {
  const { id } = useParams();
  const { showToast } = useToast();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [returns, setReturns] = useState([]);
  const [returnModal, setReturnModal] = useState(false);
  const [returnLines, setReturnLines] = useState([]);
  const [returnMeta, setReturnMeta] = useState({ returnDate: "", reason: "", notes: "" });
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [companySettings, setCompanySettings] = useState(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [correctionMeta, setCorrectionMeta] = useState(null);

  const fetchReturns = async () => {
    try {
      const res = await fetch(`/api/sales/${id}/returns`);
      const data = await res.json();
      if (res.ok) setReturns(data.returns || []);
    } catch {
      /* ignore */
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

    setReturnLines(
      (sale?.items || [])
        .map((item) => {
          const alreadyReturned = returnedByProduct[item.productId] || 0;
          const remaining = Math.max(item.quantity - alreadyReturned, 0);
          return {
            productId: item.productId,
            productName: item.productName,
            unit: item.unit,
            rate: item.rate,
            maxQty: remaining,
            quantity: 0,
            selected: false,
          };
        })
        .filter((line) => line.maxQty > 0)
    );
    setReturnMeta({ returnDate: new Date().toISOString().slice(0, 10), reason: "", notes: "" });
    setReturnModal(true);
  };

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

    setSubmittingReturn(true);
    try {
      const res = await fetch(`/api/sales/${id}/returns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...returnMeta, items }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Return ${data.return?.returnNumber || ""} recorded!`, "success");
        setReturnModal(false);
        await fetchReturns();
        await fetchSale();
        await fetchCorrectionMeta();
      } else {
        showToast(data.error || "Failed to record return", "error");
      }
    } catch {
      showToast("Error processing request", "error");
    } finally {
      setSubmittingReturn(false);
    }
  };

  const fetchSale = async () => {
    try {
      const res = await fetch(`/api/sales/${id}`);
      const data = await res.json();
      if (res.ok) {
        setSale(data.sale || data);
      } else {
        showToast(data.error || "Failed to load sale", "error");
      }
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchCorrectionMeta = async () => {
    try {
      const res = await fetch(`/api/sales/${id}/correct`);
      const data = await res.json();
      if (res.ok) setCorrectionMeta(data);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (id) {
      fetchSale();
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

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center page-enter">
        <Loader2 className="w-8 h-8 text-acc-sales animate-spin" />
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="page-enter space-y-6">
        <PageHeader
          module="sales"
          title="Sale Not Found"
          icon={DollarSign}
          breadcrumbs={[
            { label: "Sales", href: "/sales" },
            { label: "Not Found" },
          ]}
        />
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500 mb-4">This sale invoice could not be found.</p>
            <Link href="/sales">
              <Button variant="outline" className="border-slate-200 text-slate-700">
                <ArrowLeft className="w-4 h-4" /> Back to Sales
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const payment = resolveSalePayment(sale);
  const balanceDue = payment.balanceDue;
  const totalReturned = sale.totalReturned ?? returns.reduce((s, r) => s + (r.returnAmount || 0), 0);
  const { netItems: invoiceItems } = buildInvoiceLineItems(sale.items || [], returns);
  const canReturn = sale.status === "confirmed" || sale.status === "dispatched" || sale.status === "delivered";
  const hasReturnableItems = (sale.items || []).some((item) => {
    const returned = returns.reduce((sum, record) => {
      const match = (record.items || []).find((row) => row.productId === item.productId);
      return sum + (match?.quantity || 0);
    }, 0);
    return item.quantity - returned > 0;
  });

  return (
    <div className="space-y-6 page-enter pb-10">
      <PageHeader
        module="sales"
        title={sale.invoiceNumber}
        description={`Sale to ${sale.customerName}`}
        icon={DollarSign}
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: sale.invoiceNumber },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap no-print">
            <Badge variant={STATUS_VARIANTS[sale.status] || "neutral"}>{sale.status}</Badge>
            <Badge variant={PAYMENT_VARIANTS[payment.paymentStatus] || "neutral"}>
              {payment.paymentStatus}
            </Badge>
            {correctionMeta?.canCorrect && (
              <Link href={`/sales/new?correct=${id}`}>
                <Button variant="outline" className="border-amber-200 text-amber-900 bg-amber-50/60">
                  <FilePenLine className="w-4 h-4" /> Correct bill
                </Button>
              </Link>
            )}
            {canReturn && hasReturnableItems && (
              <Button onClick={openReturnModal} variant="outline" className="border-slate-200 text-slate-700">
                <Undo2 className="w-4 h-4" /> Record Return
              </Button>
            )}
            <Button
              onClick={() => setInvoiceOpen(true)}
              variant="outline"
              className="border-emerald-200 text-emerald-800 bg-emerald-50/50"
            >
              <FileText className="w-4 h-4" /> Sales invoice
            </Button>
            <Link href="/sales">
              <Button variant="outline" className="border-slate-200 text-slate-700">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            </Link>
          </div>
        }
      />

      <SaleInvoicePreviewCard sale={{ ...sale, returns }} onOpen={() => setInvoiceOpen(true)} />

      <SaleInvoicePanel
        sale={{ ...sale, returns }}
        company={companySettings}
        open={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-acc-sales" /> Line Items
              </h2>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="px-5 py-3">Product</th>
                      <th className="px-5 py-3">Qty</th>
                      <th className="px-5 py-3">Rate</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoiceItems.map((item, i) => (
                      <tr key={item.id || i} className="text-sm">
                        <td className="px-5 py-3 font-semibold text-slate-900">
                          {item.productName}
                          {item.returnedQuantity > 0 && (
                            <span className="block text-[10px] font-normal text-slate-500">
                              {formatQuantity(item.returnedQuantity, item.unit)} returned
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {formatQuantity(item.quantity, item.unit)}
                        </td>
                        <td className="px-5 py-3 font-mono text-slate-600">{formatCurrency(item.rate)}</td>
                        <td className="px-5 py-3 font-mono font-bold text-slate-900 text-right">
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))}
                    {(!sale.items || sale.items.length === 0) && (
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

          {returns.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Undo2 className="w-4 h-4 text-acc-sales" /> Returns
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
                        <th className="px-5 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {returns.map((r) => (
                        <tr key={r.id} className="text-sm">
                          <td className="px-5 py-3 font-mono font-bold text-slate-900">{r.returnNumber}</td>
                          <td className="px-5 py-3 text-slate-600">{formatDate(r.returnDate)}</td>
                          <td className="px-5 py-3 text-slate-600">{r.reason || "—"}</td>
                          <td className="px-5 py-3 font-mono font-bold text-red-600 text-right">
                            {formatCurrency(r.returnAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {sale.notes && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-acc-sales" /> Notes
                </h2>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{sale.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-acc-sales" /> Customer
              </h2>
            </CardHeader>
            <CardContent>
              <DetailRow label="Name" value={sale.customerName} />
              <DetailRow label="Type" value={sale.shopId ? "Shop" : sale.companyId ? "Company" : "—"} />
              <DetailRow label="Date" value={formatDate(sale.saleDate)} />
              {sale.createdAt && (
                <DetailRow label="Created" value={formatDateTime(sale.createdAt)} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-acc-sales" /> Amount Breakdown
              </h2>
            </CardHeader>
            <CardContent>
              <DetailRow label="Subtotal" value={formatCurrency(sale.subtotal)} mono />
              <DetailRow label="Transport" value={formatCurrency(sale.transportCost)} mono />
              <DetailRow label="Loading" value={formatCurrency(sale.loadingCost)} mono />
              <DetailRow label="Tax" value={formatCurrency(sale.taxAmount)} mono />
              <DetailRow label="Discount" value={formatCurrency(sale.discountAmount)} mono />
              {totalReturned > 0 && (
                <DetailRow label="Returns" value={`− ${formatCurrency(totalReturned)}`} mono />
              )}
              <div className="flex justify-between items-center pt-3 mt-2 border-t border-slate-200">
                <span className="text-sm font-bold text-slate-900">
                  {totalReturned > 0 ? "Net Total" : "Grand Total"}
                </span>
                <span className="font-mono font-black text-acc-sales text-lg">
                  {formatCurrency(sale.totalAmount)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-acc-sales" /> Payment
              </h2>
            </CardHeader>
            <CardContent>
              <DetailRow label="Cash" value={formatCurrency(sale.cashAmount)} mono />
              <DetailRow label="Bank" value={formatCurrency(sale.bankAmount)} mono />
              <DetailRow label="Received Total" value={formatCurrency(sale.paidAmount)} mono />
              <div className="flex justify-between items-center pt-3 mt-2 border-t border-slate-200">
                <span className="text-xs font-semibold text-slate-500">Balance Due</span>
                <span className="font-mono font-bold text-amber-600">{formatCurrency(balanceDue)}</span>
              </div>
            </CardContent>
          </Card>

          {(sale.vehicleNumber || sale.driverName) && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-acc-sales" /> Transport
                </h2>
              </CardHeader>
              <CardContent>
                {sale.vehicleNumber && <DetailRow label="Vehicle" value={sale.vehicleNumber} />}
                {sale.driverName && <DetailRow label="Driver" value={sale.driverName} />}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Modal isOpen={returnModal} onClose={() => setReturnModal(false)} title="Record Sale Return" size="lg">
        <form onSubmit={handleSubmitReturn} className="space-y-4">
          <p className="text-xs text-slate-500">
            Select items being returned by <span className="font-semibold text-slate-900">{sale.customerName}</span> for invoice{" "}
            <span className="font-mono font-bold text-slate-900">{sale.invoiceNumber}</span>.
          </p>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-3 py-2 w-8"></th>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Sold</th>
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
                        onChange={(e) => updateReturnLine(idx, "selected", e.target.checked)}
                        className="rounded border-slate-300"
                      />
                    </td>
                    <td className="px-3 py-2 font-semibold text-slate-900">{line.productName}</td>
                    <td className="px-3 py-2 text-slate-500">{formatQuantity(line.maxQty, line.unit)}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        max={line.maxQty}
                        step="any"
                        disabled={!line.selected}
                        value={line.quantity}
                        onChange={(e) => updateReturnLine(idx, "quantity", e.target.value)}
                        className="input-field py-1 px-2 text-xs disabled:opacity-40"
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
                placeholder="e.g. Damaged / customer complaint"
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

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setReturnModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 border border-slate-200 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <Button type="submit" disabled={submittingReturn} className="bg-acc-sales hover:bg-green-700 border-0">
              {submittingReturn ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />}
              Record Return
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

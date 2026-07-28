"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/Button";
import SearchPicker from "@/components/ui/SearchPicker";
import {
  ClipboardList,
  Loader2,
  Plus,
  Trash2,
  Store,
  Building2,
  ArrowLeft,
} from "lucide-react";
import { parseNumber, formatCurrency } from "@/lib/formatters";
import { CURRENCY_SYMBOL } from "@/lib/constants";

const EMPTY_ITEM = { productId: "", quantity: "", rate: "", amount: 0 };

export default function NewOrderForm({
  variant = "admin",
  backHref = "/orders",
  successPath = (id) => `/orders/${id}`,
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const mobile = variant === "mobile";
  const lockRates = mobile;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [customerType, setCustomerType] = useState("shop");
  const [shops, setShops] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    customerId: "",
    orderDate: new Date().toISOString().slice(0, 10),
    transportCost: "",
    loadingCost: "",
    taxAmount: "",
    discountAmount: "",
    notes: "",
  });
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);

  useEffect(() => {
    Promise.all([
      fetch("/api/shops").then((r) => r.json()),
      fetch("/api/companies").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
    ])
      .then(([s, c, p]) => {
        setShops(s.shops || []);
        setCompanies(c.companies || []);
        setProducts(p.products || []);
      })
      .catch(() => showToast("Error loading form", "error"))
      .finally(() => setLoading(false));
  }, [showToast]);

  const customerOptions = customerType === "shop" ? shops : companies;

  const updateItem = (index, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === "productId") {
        const product = products.find((p) => String(p.id) === String(value));
        if (product) next[index].rate = product.salePrice != null ? String(product.salePrice) : "";
      }
      const qty = parseNumber(next[index].quantity);
      const rate = parseNumber(next[index].rate);
      next[index].amount = qty * rate;
      return next;
    });
  };

  const totalAmount = useMemo(() => {
    const sub = items.reduce((s, i) => s + (i.amount || 0), 0);
    return (
      sub +
      parseNumber(form.transportCost) +
      parseNumber(form.loadingCost) +
      parseNumber(form.taxAmount) -
      parseNumber(form.discountAmount)
    );
  }, [items, form]);

  const buildPayload = () => {
    const customer = customerOptions.find((c) => String(c.id) === String(form.customerId));
    const validItems = items.filter((i) => i.productId && parseNumber(i.quantity) > 0);
    return {
      payload: {
        shopId: customerType === "shop" ? parseInt(form.customerId, 10) : null,
        companyId: customerType === "company" ? parseInt(form.customerId, 10) : null,
        customerName: customer?.name || "",
        orderDate: form.orderDate,
        items: validItems.map((item) => {
          const product = products.find((p) => String(p.id) === String(item.productId));
          return {
            productId: parseInt(item.productId, 10),
            productName: product?.name || "",
            quantity: parseNumber(item.quantity),
            unit: product?.unit || "kg",
            rate: parseNumber(item.rate),
            amount: parseNumber(item.amount),
          };
        }),
        transportCost: parseNumber(form.transportCost),
        loadingCost: parseNumber(form.loadingCost),
        taxAmount: parseNumber(form.taxAmount),
        discountAmount: parseNumber(form.discountAmount),
        notes: form.notes || null,
      },
      validItems,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customerId) {
      showToast(`Select a ${customerType}`, "warning");
      return;
    }
    const { payload, validItems } = buildPayload();
    if (!validItems.length) {
      showToast("Add at least one line", "warning");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Order submitted for review", "success");
        router.push(successPath(data.order.id));
      } else showToast(data.error || "Failed", "error");
    } catch {
      showToast("Request failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${mobile ? "min-h-[50vh]" : "h-72"}`}>
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  const customerToggle = (
    <div
      className={
        mobile
          ? "sp-segment grid grid-cols-2 gap-1 p-1"
          : "grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg"
      }
    >
      <button
        type="button"
        onClick={() => {
          setCustomerType("shop");
          setForm({ ...form, customerId: "" });
        }}
        className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
          customerType === "shop"
            ? mobile
              ? "sp-segment-active-shop"
              : "bg-emerald-600 text-white"
            : "text-slate-600"
        }`}
      >
        <Store className="w-4 h-4" /> Shop
      </button>
      <button
        type="button"
        onClick={() => {
          setCustomerType("company");
          setForm({ ...form, customerId: "" });
        }}
        className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
          customerType === "company"
            ? mobile
              ? "sp-segment-active-company"
              : "bg-amber-500 text-white"
            : "text-slate-600"
        }`}
      >
        <Building2 className="w-4 h-4" /> Company
      </button>
    </div>
  );

  const lineItemsMobile = (
    <div className="space-y-3 mt-4">
      {items.map((item, index) => (
        <div key={index} className="sp-line-card">
          <select
            className="input-field w-full min-h-[44px] text-base"
            value={item.productId}
            onChange={(e) => updateItem(index, "productId", e.target.value)}
          >
            <option value="">Choose product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className={lockRates ? "col-span-2" : ""}>
              <label className="text-[10px] font-bold uppercase text-slate-500">Qty</label>
              <input
                type="number"
                inputMode="decimal"
                className="input-field w-full min-h-[44px] text-base tabular-nums"
                value={item.quantity}
                onChange={(e) => updateItem(index, "quantity", e.target.value)}
              />
            </div>
            {!lockRates && (
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Rate</label>
                <input
                  type="number"
                  inputMode="decimal"
                  className="input-field w-full min-h-[44px] text-base tabular-nums"
                  value={item.rate}
                  onChange={(e) => updateItem(index, "rate", e.target.value)}
                />
              </div>
            )}
            {lockRates && item.productId && (
              <p className="col-span-2 text-xs text-slate-500 mt-1">
                Sale rate: <span className="font-semibold text-slate-800">{formatCurrency(parseNumber(item.rate))}</span>
                <span className="text-slate-400"> (set by admin)</span>
              </p>
            )}
          </div>
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
            <span className="text-sm font-bold text-slate-800">{formatCurrency(item.amount || 0)}</span>
            <button
              type="button"
              onClick={() => items.length > 1 && setItems(items.filter((_, i) => i !== index))}
              className="p-2 text-slate-400 hover:text-red-600"
              aria-label="Remove line"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setItems([...items, { ...EMPTY_ITEM }])}
        className="w-full py-3 rounded-xl border-2 border-dashed border-orange-200 text-orange-700 font-semibold text-sm flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" /> Add product line
      </button>
    </div>
  );

  if (mobile) {
    return (
      <form onSubmit={handleSubmit} className="page-enter max-w-lg mx-auto pb-32">
        <div className="flex items-center gap-2 mb-4">
          <Link href={backHref} className="sp-back-btn" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">New order</h1>
            <p className="text-xs text-slate-500">Submitted to admin for approval</p>
          </div>
        </div>

        <div className="sp-section-card">
          <p className="sp-section-title">Customer</p>
          {customerToggle}
          <div className="mt-3">
            <SearchPicker
              hideLabel
              label={customerType === "shop" ? "Shop" : "Company"}
              options={customerOptions}
              value={form.customerId}
              onChange={(id) => setForm({ ...form, customerId: id })}
              getOptionLabel={(c) => c.name}
              fieldClassName="!min-h-[48px]"
            />
          </div>
          <label className="text-[10px] font-bold uppercase text-slate-500 mt-4 block">Date</label>
          <input
            type="date"
            className="input-field w-full min-h-[44px] mt-1"
            value={form.orderDate}
            onChange={(e) => setForm({ ...form, orderDate: e.target.value })}
          />
        </div>

        <div className="sp-section-card mt-3">
          <p className="sp-section-title">Products</p>
          {lineItemsMobile}
        </div>

        <div className="sp-section-card mt-3">
          <p className="sp-section-title">Notes (optional)</p>
          <textarea
            className="input-field w-full min-h-[88px] mt-2 text-base"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Delivery instructions…"
          />
        </div>

        <div className="sp-total-bar mt-4">
          <span className="text-sm font-semibold text-slate-600">Order total</span>
          <span className="text-2xl font-bold text-orange-700 tabular-nums">
            {CURRENCY_SYMBOL}
            {totalAmount.toLocaleString()}
          </span>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-20 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white/90 backdrop-blur-md border-t border-slate-100">
          <div className="max-w-lg mx-auto">
            <button type="submit" disabled={submitting} className="sp-submit-btn w-full">
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit for review"}
            </button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="page-enter pb-8 space-y-6">
      <PageHeader
        module="orders"
        title="New customer order"
        description="Sales staff capture order details; admin accepts before invoicing."
        icon={ClipboardList}
        breadcrumbs={[{ label: "Orders", href: backHref }, { label: "New" }]}
        actions={
          <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-orange-700">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 erp-doc-section p-4 rounded-xl border border-orange-100">
        <div className="space-y-3">
          {customerToggle}
          <SearchPicker
            label={customerType === "shop" ? "Shop *" : "Company *"}
            options={customerOptions}
            value={form.customerId}
            onChange={(id) => setForm({ ...form, customerId: id })}
            getOptionLabel={(c) => c.name}
          />
          <label className="block text-xs font-semibold text-slate-500">Order date</label>
          <input
            type="date"
            className="input-field"
            value={form.orderDate}
            onChange={(e) => setForm({ ...form, orderDate: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Notes</label>
          <textarea
            className="input-field w-full min-h-[100px]"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
      </div>

      <div className="erp-doc-section p-4 rounded-xl border border-orange-100 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase text-slate-500">
              <th className="pb-2">Product</th>
              <th className="pb-2 text-right">Qty</th>
              <th className="pb-2 text-right">Rate</th>
              <th className="pb-2 text-right">Amount</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td className="py-1 pr-2">
                  <select
                    className="input-field-compact w-full"
                    value={item.productId}
                    onChange={(e) => updateItem(index, "productId", e.target.value)}
                  >
                    <option value="">Product…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-1">
                  <input
                    type="number"
                    className="input-field-compact w-24 text-right"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, "quantity", e.target.value)}
                  />
                </td>
                <td className="py-1">
                  <input
                    type="number"
                    className="input-field-compact w-28 text-right"
                    value={item.rate}
                    onChange={(e) => updateItem(index, "rate", e.target.value)}
                  />
                </td>
                <td className="py-1 text-right font-mono text-xs">
                  {CURRENCY_SYMBOL}
                  {parseNumber(item.amount).toLocaleString()}
                </td>
                <td className="py-1">
                  <button
                    type="button"
                    onClick={() => items.length > 1 && setItems(items.filter((_, i) => i !== index))}
                    className="text-slate-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          onClick={() => setItems([...items, { ...EMPTY_ITEM }])}
          className="mt-3 text-xs font-semibold text-orange-700 flex items-center gap-1"
        >
          <Plus className="w-4 h-4" /> Add line
        </button>
        <p className="mt-4 text-right font-bold text-orange-800">
          Total {CURRENCY_SYMBOL}
          {totalAmount.toLocaleString()}
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={submitting} className="bg-orange-600 border-0 min-w-[160px]">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit order"}
        </Button>
      </div>
    </form>
  );
}

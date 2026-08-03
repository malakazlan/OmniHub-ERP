"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/Button";
import SearchPicker from "@/components/ui/SearchPicker";
import {
  DollarSign,
  Loader2,
  Plus,
  Trash2,
  Store,
  Building2,
  ArrowLeft,
  Save,
  CheckCircle2,
  Banknote,
  Landmark,
  Receipt,
} from "lucide-react";
import { parseNumber } from "@/lib/formatters";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { useDefaultCashAccountId, applyDefaultCashAccount } from "@/hooks/useDefaultCashAccount";

const EMPTY_ITEM = { productId: "", quantity: "", rate: "", amount: 0 };

function FieldLabel({ children, className = "" }) {
  return (
    <span
      className={`block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5 ${className}`}
    >
      {children}
    </span>
  );
}

function Money({ value, className = "", muted = false, strong = false, placeholder = "—", emptyIfZero = false }) {
  if (value === "" || value == null) {
    return <span className={`text-sm text-slate-400 tabular-nums ${className}`}>{placeholder}</span>;
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return <span className={`text-sm text-slate-400 tabular-nums ${className}`}>{placeholder}</span>;
  }
  if (emptyIfZero && num === 0) {
    return <span className={`text-sm text-slate-400 tabular-nums ${className}`}>{placeholder}</span>;
  }
  const formatted = num.toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return (
    <span
      className={`erp-money ${muted ? "erp-money-muted" : ""} ${strong ? "erp-money-strong" : ""} ${className}`}
    >
      <span className="erp-money-sym text-[0.72em] font-medium text-slate-500 mr-0.5">{CURRENCY_SYMBOL}</span>
      {formatted}
    </span>
  );
}

function DocSection({ title, meta, children, className = "" }) {
  return (
    <section className={`erp-doc-section ${className}`}>
      {(title || meta) && (
        <div className="erp-doc-section-head">
          {title ? <h2 className="erp-doc-section-title">{title}</h2> : <span />}
          {meta ? <div className="erp-doc-section-meta">{meta}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}

function SummaryRow({ label, value, bold = false, grand = false, children }) {
  return (
    <div
      className={`erp-summary-row ${bold && !grand ? "erp-summary-row-total" : ""} ${grand ? "erp-summary-row-grand" : ""}`}
    >
      <span className={grand ? "text-[11px] font-semibold uppercase tracking-wide text-green-800/70" : ""}>
        {label}
      </span>
      {children ?? <Money value={value} strong={bold || grand} muted={!bold && !grand} />}
    </div>
  );
}

export default function NewSalePage() {
  return (
    <Suspense
      fallback={
        <div className="h-72 flex items-center justify-center page-enter">
          <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
        </div>
      }
    >
      <NewSalePageInner />
    </Suspense>
  );
}

function NewSalePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const defaultCashAccountId = useDefaultCashAccountId();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [customerType, setCustomerType] = useState("shop");
  const [shops, setShops] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [products, setProducts] = useState([]);
  const [accounts, setAccounts] = useState([]);

  const [form, setForm] = useState({
    customerId: "",
    saleDate: new Date().toISOString().slice(0, 10),
    transportCost: "",
    loadingCost: "",
    taxAmount: "",
    discountAmount: "",
    cashAmount: "",
    bankAmount: "",
    cashAccountId: "",
    bankAccountId: "",
    notes: "",
  });
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [acceptedOrders, setAcceptedOrders] = useState([]);
  const [customerOrderId, setCustomerOrderId] = useState("");

  const applyOrderToForm = (order, productList) => {
    if (!order) return;
    setCustomerOrderId(String(order.id));
    const type = order.shopId ? "shop" : "company";
    setCustomerType(type);
    setForm((f) => ({
      ...f,
      customerId: String(order.shopId || order.companyId || ""),
      transportCost: order.transportCost ? String(order.transportCost) : "",
      loadingCost: order.loadingCost ? String(order.loadingCost) : "",
      taxAmount: order.taxAmount ? String(order.taxAmount) : "",
      discountAmount: order.discountAmount ? String(order.discountAmount) : "",
      notes: order.notes || "",
    }));
    setItems(
      order.items?.length
        ? order.items.map((line) => ({
            productId: String(line.productId),
            quantity: String(line.quantity),
            rate: String(line.rate),
            amount: line.amount,
          }))
        : [{ ...EMPTY_ITEM }]
    );
    showToast(`Loaded order ${order.orderNumber}`, "success");
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [shopsRes, companiesRes, productsRes, ordersRes, accountsRes] = await Promise.all([
          fetch("/api/shops"),
          fetch("/api/companies"),
          fetch("/api/products"),
          fetch("/api/orders?forSale=1"),
          fetch("/api/accounts"),
        ]);
        const [shopsData, companiesData, productsData, ordersData, accountsData] = await Promise.all([
          shopsRes.json(),
          companiesRes.json(),
          productsRes.json(),
          ordersRes.json(),
          accountsRes.json(),
        ]);
        if (shopsRes.ok) setShops(shopsData.shops || []);
        if (companiesRes.ok) setCompanies(companiesData.companies || []);
        if (productsRes.ok) setProducts(productsData.products || []);
        if (ordersRes.ok) setAcceptedOrders(ordersData.orders || []);
        if (accountsRes.ok) setAccounts((accountsData.accounts || []).filter((a) => a.isActive));

        const orderIdParam = searchParams.get("orderId");
        if (orderIdParam) {
          const orderRes = await fetch(`/api/orders/${orderIdParam}`);
          const orderJson = await orderRes.json();
          if (orderRes.ok && orderJson.order?.status === "accepted") {
            applyOrderToForm(orderJson.order, productsData.products || []);
          }
        }
      } catch {
        showToast("Error loading form data", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showToast, searchParams]);

  useEffect(() => {
    if (!defaultCashAccountId) return;
    setForm((f) => applyDefaultCashAccount(f, defaultCashAccountId));
  }, [defaultCashAccountId]);

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

  const addItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }]);

  const removeItem = (index) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + (item.amount || 0), 0), [items]);

  const surcharges =
    parseNumber(form.transportCost) + parseNumber(form.loadingCost) + parseNumber(form.taxAmount);

  const totalAmount = subtotal + surcharges - parseNumber(form.discountAmount);
  const paidAmount = parseNumber(form.cashAmount) + parseNumber(form.bankAmount);
  const balanceDue = Math.max(totalAmount - paidAmount, 0);

  const cashAccounts = useMemo(() => accounts.filter((a) => a.category === "cash"), [accounts]);
  const bankAccounts = useMemo(() => accounts.filter((a) => a.category === "bank"), [accounts]);

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (status) => {
    if (!form.customerId) {
      showToast(`Please select a ${customerType}`, "warning");
      return;
    }

    const validItems = items.filter((item) => item.productId && parseNumber(item.quantity) > 0);
    if (validItems.length === 0) {
      showToast("Add at least one product line", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const customer = customerOptions.find((c) => String(c.id) === String(form.customerId));
      const payload = {
        customerType,
        customerName: customer?.name || "",
        shopId: customerType === "shop" ? parseInt(form.customerId, 10) : null,
        companyId: customerType === "company" ? parseInt(form.customerId, 10) : null,
        customerOrderId: customerOrderId ? parseInt(customerOrderId, 10) : null,
        saleDate: form.saleDate,
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
        cashAmount: parseNumber(form.cashAmount),
        bankAmount: parseNumber(form.bankAmount),
        cashAccountId: form.cashAccountId ? parseInt(form.cashAccountId, 10) : null,
        bankAccountId: form.bankAccountId ? parseInt(form.bankAccountId, 10) : null,
        notes: form.notes || null,
        status,
      };

      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        showToast(status === "confirmed" ? "Sale confirmed" : "Draft saved", "success");
        router.push(`/sales/${data.sale?.id || data.id}`);
      } else {
        showToast(data.error || "Failed to create sale", "error");
      }
    } catch {
      showToast("Error processing request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-72 flex items-center justify-center page-enter">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-enter pb-8 erp-sales-page space-y-5 sm:space-y-6">
      <PageHeader
        module="sales"
        title="New sale invoice"
        description="Customer, line items, charges, and payment."
        icon={DollarSign}
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "New invoice" },
        ]}
        actions={
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-2 w-full sm:w-auto">
            <Link
              href="/sales"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200/90 bg-white text-sm font-medium text-slate-600 hover:text-green-700 hover:border-green-200 hover:bg-green-50/60 transition-all duration-200 ease-out"
            >
              <ArrowLeft className="w-4 h-4" /> Back to list
            </Link>
            <div className="w-full sm:w-[9.5rem]">
              <FieldLabel>Invoice date</FieldLabel>
              <input
                type="date"
                value={form.saleDate}
                onChange={handleChange("saleDate")}
                className="input-field w-full min-h-[40px] text-sm"
              />
            </div>
          </div>
        }
      />

      {acceptedOrders.length > 0 && (
        <div className="erp-doc-section p-4 rounded-xl border border-green-100 bg-green-50/40">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-green-800/70 mb-2">
            Load accepted order
          </p>
          <select
            className="input-field max-w-md"
            value={customerOrderId}
            onChange={async (e) => {
              const val = e.target.value;
              setCustomerOrderId(val);
              if (!val) return;
              const res = await fetch(`/api/orders/${val}`);
              const data = await res.json();
              if (res.ok) applyOrderToForm(data.order, products);
              else showToast(data.error || "Could not load order", "error");
            }}
          >
            <option value="">Select an accepted order…</option>
            {acceptedOrders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.orderNumber} — {o.customerName} ({o.totalAmount?.toLocaleString()} PKR)
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DocSection title="Customer" className="overflow-visible">
          <div className="erp-doc-body space-y-4 overflow-visible">
            <div
              className="erp-vendor-switch grid grid-cols-2 gap-2 p-1.5 rounded-xl bg-slate-100/80 border border-slate-200/60"
              role="tablist"
              aria-label="Customer type"
            >
              <button
                type="button"
                role="tab"
                aria-selected={customerType === "shop"}
                onClick={() => {
                  setCustomerType("shop");
                  setForm({ ...form, customerId: "" });
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all duration-300 ease-out cursor-pointer select-none ${
                  customerType === "shop"
                    ? "bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-600/25 ring-1 ring-emerald-400/50"
                    : "text-slate-600 hover:bg-white/95 hover:text-emerald-700 hover:ring-1 hover:ring-emerald-200/80"
                }`}
              >
                <Store className="w-4 h-4 shrink-0" strokeWidth={2.25} />
                Shop
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={customerType === "company"}
                onClick={() => {
                  setCustomerType("company");
                  setForm({ ...form, customerId: "" });
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all duration-300 ease-out cursor-pointer select-none ${
                  customerType === "company"
                    ? "bg-gradient-to-b from-amber-400 to-amber-500 text-amber-950 shadow-md shadow-amber-500/30 ring-1 ring-amber-300/70"
                    : "text-slate-600 hover:bg-white/95 hover:text-amber-800 hover:ring-1 hover:ring-amber-200/90"
                }`}
              >
                <Building2 className="w-4 h-4 shrink-0" strokeWidth={2.25} />
                Company
              </button>
            </div>
            <SearchPicker
              label={customerType === "shop" ? "Shop *" : "Company *"}
              placeholder={`Search ${customerType === "shop" ? "shops" : "companies"}…`}
              options={customerOptions}
              value={form.customerId}
              onChange={(id) => setForm({ ...form, customerId: id })}
              getOptionLabel={(c) => c.name}
              labelClassName={customerType === "shop" ? "text-emerald-800/80" : "text-amber-900/70"}
              fieldClassName={
                customerType === "shop"
                  ? "!focus-within:border-emerald-500 !focus-within:shadow-[0_0_0_2px_rgba(16,185,129,0.2)]"
                  : "!focus-within:border-amber-500 !focus-within:shadow-[0_0_0_2px_rgba(245,158,11,0.25)]"
              }
              renderOption={(c) => (
                <span>
                  {c.name}
                  {c.phone ? <span className="text-slate-400 text-xs ml-2">{c.phone}</span> : null}
                  {c.city ? <span className="text-slate-400 text-xs ml-1">· {c.city}</span> : null}
                </span>
              )}
            />
          </div>
        </DocSection>

        <DocSection title="Notes">
          <div className="erp-doc-body">
            <FieldLabel>Delivery / payment notes</FieldLabel>
            <textarea
              value={form.notes}
              onChange={handleChange("notes")}
              className="input-field w-full min-h-[88px] resize-y text-sm"
              placeholder="Optional instructions…"
            />
          </div>
        </DocSection>
      </div>

      <DocSection
        title="Line items"
        meta={
          <span>
            {items.filter((i) => i.productId).length} lines · Subtotal <Money value={subtotal} strong />
          </span>
        }
      >
        <div className="overflow-x-auto">
          <table className="erp-line-table w-full min-w-[720px]">
            <thead>
              <tr>
                <th className="text-left pl-4">Product</th>
                <th className="text-right w-[100px]">Qty</th>
                <th className="text-right w-[110px]">Rate</th>
                <th className="text-right w-[110px]">Amount</th>
                <th className="w-11 pr-3" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                  <tr key={index} className="erp-data-row">
                    <td className="pl-4 min-w-[180px]">
                      <select
                        value={item.productId}
                        onChange={(e) => updateItem(index, "productId", e.target.value)}
                        className="input-field-compact w-full text-sm"
                        aria-label="Product"
                      >
                        <option value="">Select product…</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} · Stock {p.currentStock} {p.unit}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="text-right">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", e.target.value)}
                        className="input-field-compact w-full text-right tabular-nums"
                        placeholder="0"
                      />
                    </td>
                    <td className="text-right">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.rate}
                        onChange={(e) => updateItem(index, "rate", e.target.value)}
                        className="input-field-compact w-full text-right tabular-nums"
                        placeholder="0"
                      />
                    </td>
                    <td className="text-right pr-3">
                      <Money value={item.amount} strong emptyIfZero={false} />
                    </td>
                    <td className="pr-3 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:text-green-700 hover:bg-green-50 disabled:opacity-30 active:scale-[0.98] transition-all duration-200 cursor-pointer"
                        aria-label="Remove line"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-green-50/40 border-t border-green-100">
                <td colSpan={3} className="pl-4 py-2 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  Merchandise subtotal
                </td>
                <td className="text-right py-2 pr-3">
                  <Money value={subtotal} strong />
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="erp-doc-body pt-0 border-t border-green-100/80">
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-2 text-xs font-semibold text-green-700 hover:text-green-900 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add line
          </button>
        </div>
      </DocSection>

      <DocSection
        title="Invoice & settlement"
        meta={
          <span className="inline-flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 text-slate-400" />
            Total <Money value={totalAmount} strong />
          </span>
        }
      >
        <div className="erp-settlement">
          <div className="erp-settlement-grid">
            <div className="erp-settlement-charges erp-doc-body space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Additional charges</p>
              {[
                { field: "transportCost", label: "Transport" },
                { field: "loadingCost", label: "Loading" },
                { field: "taxAmount", label: "Tax / GST" },
              ].map(({ field, label }) => (
                <div key={field}>
                  <FieldLabel>{label}</FieldLabel>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form[field]}
                    onChange={handleChange(field)}
                    className="input-field w-full tabular-nums text-sm"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>

            <div className="erp-settlement-main erp-doc-body space-y-4">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="erp-summary-block">
                  <div className="erp-summary-block-title">Invoice summary</div>
                  <SummaryRow label="Merchandise subtotal" value={subtotal} />
                  <SummaryRow label="Transport" value={parseNumber(form.transportCost)} />
                  <SummaryRow label="Loading" value={parseNumber(form.loadingCost)} />
                  <SummaryRow label="Tax / GST" value={parseNumber(form.taxAmount)} />
                  <div className="erp-summary-row">
                    <span>Discount</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={form.discountAmount}
                      onChange={handleChange("discountAmount")}
                      className="input-field-compact w-[100px] text-right tabular-nums"
                      placeholder="0"
                    />
                  </div>
                  <SummaryRow label="Amount receivable" value={totalAmount} grand />
                </div>

                <div className="erp-summary-block">
                  <div className="erp-summary-block-title">Payment received</div>
                  <div className="p-2 sm:p-3">
                    <table className="erp-payment-table">
                      <thead>
                        <tr>
                          <th className="w-[72px]">Method</th>
                          <th>Ledger account</th>
                          <th className="w-[120px]">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>
                            <span className="erp-method-tag erp-method-tag-cash">
                              <Banknote className="w-3 h-3" /> Cash
                            </span>
                          </td>
                          <td>
                            <select
                              value={form.cashAccountId}
                              onChange={handleChange("cashAccountId")}
                              className="input-field-compact w-full text-xs bg-white"
                            >
                              <option value="">Select account</option>
                              {cashAccounts.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={form.cashAmount}
                              onChange={handleChange("cashAmount")}
                              className="input-field-compact w-full text-right tabular-nums"
                              placeholder="0"
                              aria-label="Cash payment amount"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <span className="erp-method-tag erp-method-tag-bank">
                              <Landmark className="w-3 h-3" /> Bank
                            </span>
                          </td>
                          <td>
                            <select
                              value={form.bankAccountId}
                              onChange={handleChange("bankAccountId")}
                              className="input-field-compact w-full text-xs bg-white"
                            >
                              <option value="">Select account</option>
                              {bankAccounts.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={form.bankAmount}
                              onChange={handleChange("bankAmount")}
                              className="input-field-compact w-full text-right tabular-nums"
                              placeholder="0"
                              aria-label="Bank payment amount"
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          if (balanceDue <= 0) return;
                          setForm((f) => ({ ...f, cashAmount: String(balanceDue), bankAmount: "" }));
                        }}
                        className="text-[11px] font-semibold text-green-700 hover:text-green-900 cursor-pointer underline-offset-2 hover:underline"
                      >
                        Apply full balance to cash
                      </button>
                      <span className="text-[11px] text-slate-500">
                        Due after payment: <Money value={balanceDue} strong className="text-green-800" />
                      </span>
                    </div>
                  </div>
                  <SummaryRow label="Total received" value={paidAmount} bold />
                  <SummaryRow label="Outstanding on invoice">
                    <Money
                      value={balanceDue}
                      strong
                      className={balanceDue > 0 ? "text-amber-700" : "text-emerald-700"}
                    />
                  </SummaryRow>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="erp-doc-actions flex flex-col-reverse sm:flex-row sm:justify-end">
          <Button
            type="button"
            disabled={submitting}
            variant="outline"
            onClick={() => handleSubmit("draft")}
            className="min-h-[42px] sm:min-w-[140px] bg-white border-slate-200/90 text-slate-700 shadow-none rounded-lg transition-all duration-200"
          >
            <Save className="w-4 h-4" /> Save draft
          </Button>
          <Button
            type="button"
            disabled={submitting}
            variant="brand"
            onClick={() => handleSubmit("confirmed")}
            className="min-h-[42px] sm:min-w-[200px] rounded-lg shadow-md transition-all duration-200 active:scale-[0.99]"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Confirm sale
          </Button>
        </div>
      </DocSection>
    </div>
  );
}

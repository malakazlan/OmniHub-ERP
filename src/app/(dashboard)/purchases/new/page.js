"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/Button";
import {
  ShoppingCart,
  Loader2,
  Plus,
  Trash2,
  Sprout,
  Building2,
  ArrowLeft,
  Save,
  CheckCircle2,
  Banknote,
  Landmark,
  Receipt,
  AlertTriangle,
} from "lucide-react";
import { formatCurrency, parseNumber } from "@/lib/formatters";
import { isVendorCompany } from "@/lib/saleCustomer";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import SearchPicker from "@/components/ui/SearchPicker";
import { computeVendorBalancesForPurchase } from "@/lib/purchaseBalances";
import { PageHeader } from "@/components/layout/PageHeader";
import { useDefaultCashAccountId, applyDefaultCashAccount } from "@/hooks/useDefaultCashAccount";
import { FleetVehicleDriverFields } from "@/components/fleet/FleetVehicleDriverFields";

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
  const formatted = num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
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
      <span className={grand ? "text-[11px] font-semibold uppercase tracking-wide text-blue-800/70" : ""}>{label}</span>
      {children ?? <Money value={value} strong={bold || grand} muted={!bold && !grand} />}
    </div>
  );
}

export default function NewPurchasePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const correctId = searchParams.get("correct");
  const isEdit = Boolean(editId);
  const isCorrection = Boolean(correctId);
  const { showToast } = useToast();
  const defaultCashAccountId = useDefaultCashAccountId();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [vendorType, setVendorType] = useState("company");
  const [farmers, setFarmers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [products, setProducts] = useState([]);
  const [accounts, setAccounts] = useState([]);

  const [form, setForm] = useState({
    vendorId: "",
    purchaseDate: new Date().toISOString().slice(0, 10),
    supplierInvoiceRef: "",
    transportCost: "",
    loadingCost: "",
    labourCost: "",
    taxAmount: "",
    discountAmount: "",
    cashAmount: "",
    bankAmount: "",
    cashAccountId: "",
    bankAccountId: "",
    vehicleNumber: "",
    driverName: "",
    notes: "",
  });

  const [lineEntry, setLineEntry] = useState({ productId: "", quantity: "", rate: "" });
  const [cartItems, setCartItems] = useState([]);
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionBillNumber, setCorrectionBillNumber] = useState("");

  const applyPurchaseToForm = (purchase) => {
    if (!purchase) return;
    setVendorType(purchase.farmerId ? "farmer" : "company");
    setCorrectionBillNumber(purchase.purchaseNumber || "");
    setForm({
      vendorId: String(purchase.farmerId || purchase.companyId || ""),
      purchaseDate: purchase.purchaseDate?.slice?.(0, 10) || new Date().toISOString().slice(0, 10),
      supplierInvoiceRef: "",
      transportCost: purchase.transportCost ? String(purchase.transportCost) : "",
      loadingCost: purchase.loadingCost ? String(purchase.loadingCost) : "",
      labourCost: purchase.labourCost ? String(purchase.labourCost) : "",
      taxAmount: purchase.taxAmount ? String(purchase.taxAmount) : "",
      discountAmount: purchase.discountAmount ? String(purchase.discountAmount) : "",
      cashAmount: purchase.cashAmount ? String(purchase.cashAmount) : "",
      bankAmount: purchase.bankAmount ? String(purchase.bankAmount) : "",
      cashAccountId: purchase.cashAccountId ? String(purchase.cashAccountId) : "",
      bankAccountId: purchase.bankAccountId ? String(purchase.bankAccountId) : "",
      vehicleNumber: purchase.vehicleNumber || "",
      driverName: purchase.driverName || "",
      notes: purchase.notes || "",
    });
    setCartItems(
      (purchase.items || []).map((item) => ({
        productId: String(item.productId),
        productName: item.productName,
        unit: item.unit,
        quantity: String(item.quantity),
        rate: String(item.rate),
        amount: item.amount,
      }))
    );
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [farmersRes, companiesRes, productsRes, accountsRes] = await Promise.all([
          fetch("/api/farmers"),
          fetch("/api/companies"),
          fetch("/api/products"),
          fetch("/api/accounts"),
        ]);
        const [farmersData, companiesData, productsData, accountsData] = await Promise.all([
          farmersRes.json(),
          companiesRes.json(),
          productsRes.json(),
          accountsRes.json(),
        ]);
        if (farmersRes.ok) setFarmers(farmersData.farmers || []);
        if (companiesRes.ok) setCompanies(companiesData.companies || []);
        if (productsRes.ok) setProducts(productsData.products || []);
        if (accountsRes.ok) setAccounts((accountsData.accounts || []).filter((a) => a.isActive));

        if (correctId) {
          const corrRes = await fetch(`/api/purchases/${correctId}/correct`);
          const corrData = await corrRes.json();
          if (!corrRes.ok || !corrData.canCorrect) {
            showToast(corrData.reason || corrData.error || "This bill cannot be corrected", "warning");
            router.push(`/purchases/${correctId}`);
            return;
          }
          applyPurchaseToForm(corrData.purchase);
        } else if (editId) {
          const poRes = await fetch(`/api/purchases/${editId}`);
          const poData = await poRes.json();
          const po = poData.purchase;
          if (!poRes.ok || !po) {
            showToast("Could not load draft purchase", "error");
            router.push("/purchases");
            return;
          }
          if (po.status !== "draft") {
            showToast("Only draft purchases can be edited", "warning");
            router.push(`/purchases?bill=${editId}`);
            return;
          }
          setVendorType(po.farmerId ? "farmer" : "company");
          setForm({
            vendorId: String(po.farmerId || po.companyId || ""),
            purchaseDate: po.purchaseDate?.slice?.(0, 10) || new Date().toISOString().slice(0, 10),
            supplierInvoiceRef: "",
            transportCost: po.transportCost ? String(po.transportCost) : "",
            loadingCost: po.loadingCost ? String(po.loadingCost) : "",
            labourCost: po.labourCost ? String(po.labourCost) : "",
            taxAmount: po.taxAmount ? String(po.taxAmount) : "",
            discountAmount: po.discountAmount ? String(po.discountAmount) : "",
            cashAmount: po.cashAmount ? String(po.cashAmount) : "",
            bankAmount: po.bankAmount ? String(po.bankAmount) : "",
            cashAccountId: po.cashAccountId ? String(po.cashAccountId) : "",
            bankAccountId: po.bankAccountId ? String(po.bankAccountId) : "",
            vehicleNumber: po.vehicleNumber || "",
            driverName: po.driverName || "",
            notes: po.notes || "",
          });
          setCartItems(
            (po.items || []).map((item) => ({
              productId: String(item.productId),
              productName: item.productName,
              unit: item.unit,
              quantity: String(item.quantity),
              rate: String(item.rate),
              amount: item.amount,
            }))
          );
        }
      } catch {
        showToast("Error loading form data", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [editId, correctId, router, showToast]);

  useEffect(() => {
    if (!defaultCashAccountId || editId || isCorrection) return;
    setForm((f) => applyDefaultCashAccount(f, defaultCashAccountId));
  }, [defaultCashAccountId, editId, isCorrection]);

  const vendorOptions = vendorType === "farmer" ? farmers : companies.filter(isVendorCompany);
  // Farmer vendors are legacy; the tab only appears when editing an old bill that used one.
  const legacyVendorType = vendorType === "farmer";

  const selectedVendor = useMemo(
    () => vendorOptions.find((v) => String(v.id) === String(form.vendorId)),
    [vendorOptions, form.vendorId]
  );

  const lineQty = parseNumber(lineEntry.quantity);
  const lineRate = parseNumber(lineEntry.rate);
  const lineTotal = lineQty * lineRate;

  const subtotal = useMemo(() => cartItems.reduce((s, i) => s + (i.amount || 0), 0), [cartItems]);

  const surcharges =
    parseNumber(form.transportCost) +
    parseNumber(form.loadingCost) +
    parseNumber(form.labourCost) +
    parseNumber(form.taxAmount);

  const cartTotalQty = useMemo(
    () => cartItems.reduce((s, i) => s + parseNumber(i.quantity), 0),
    [cartItems]
  );

  const totalQuantityForCharges = cartTotalQty + (lineQty > 0 ? lineQty : 0);

  const chargePerUnit =
    totalQuantityForCharges > 0 && surcharges > 0 ? surcharges / totalQuantityForCharges : 0;

  const cartChargePerUnit =
    cartTotalQty > 0 && surcharges > 0 ? surcharges / cartTotalQty : 0;

  /** Landed cost per unit: purchase rate + share of bill charges */
  const lineCostRate = lineRate > 0 ? lineRate + chargePerUnit : 0;

  const totalAmount = subtotal + surcharges - parseNumber(form.discountAmount);
  const paidAmount = parseNumber(form.cashAmount) + parseNumber(form.bankAmount);
  const balanceDue = Math.max(totalAmount - paidAmount, 0);

  const vendorLedgerBalance = selectedVendor?.balance ?? 0;
  const { previousBalance: vendorPreviousBalance, currentBalance: vendorProjectedBalance } =
    computeVendorBalancesForPurchase(
      { totalAmount, paidAmount, status: "draft" },
      vendorLedgerBalance
    );

  const cashAccounts = accounts.filter((a) => a.category === "cash");
  const bankAccounts = accounts.filter((a) => a.category === "bank");

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const onLineProductChange = (productId) => {
    const product = products.find((p) => String(p.id) === String(productId));
    const defaultRate =
      product?.costPrice != null && product.costPrice !== ""
        ? String(product.costPrice)
        : lineEntry.rate;
    setLineEntry({
      productId,
      quantity: lineEntry.quantity,
      rate: defaultRate,
    });
  };

  const addToCart = () => {
    if (!lineEntry.productId) {
      showToast("Select a item", "warning");
      return;
    }
    if (lineQty <= 0) {
      showToast("Enter quantity", "warning");
      return;
    }
    const product = products.find((p) => String(p.id) === String(lineEntry.productId));
    setCartItems((prev) => [
      ...prev,
      {
        productId: lineEntry.productId,
        productName: product?.name || "",
        unit: product?.unit || "ea",
        quantity: lineEntry.quantity,
        rate: lineEntry.rate,
        amount: lineTotal,
      },
    ]);
    setLineEntry({ productId: "", quantity: "", rate: "" });
  };

  const removeFromCart = (index) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateCartItem = (index, field, value) => {
    setCartItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const next = { ...item, [field]: value };
        const qty = parseNumber(next.quantity);
        const rate = parseNumber(next.rate);
        next.amount = qty * rate;
        return next;
      })
    );
  };

  const cartItemCostRate = (item) => {
    const rate = parseNumber(item.rate);
    return rate > 0 ? rate + cartChargePerUnit : 0;
  };

  const handleCorrectionSubmit = async () => {
    const reason = correctionReason.trim();
    if (reason.length < 3) {
      showToast("Enter a correction reason (minimum 3 characters)", "warning");
      return;
    }
    if (!form.vendorId) {
      showToast(`Please select a ${vendorType === "company" ? "vendor" : vendorType}`, "warning");
      return;
    }
    const vendorName = selectedVendor?.name?.trim();
    if (!vendorName) {
      showToast("Could not resolve supplier name", "error");
      return;
    }
    if (cartItems.length === 0) {
      showToast("Add at least one item to the cart", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        vendorName,
        farmerId: vendorType === "farmer" ? parseInt(form.vendorId, 10) : null,
        companyId: vendorType === "company" ? parseInt(form.vendorId, 10) : null,
        purchaseDate: form.purchaseDate,
        items: cartItems.map((item) => ({
          productId: parseInt(item.productId, 10),
          productName: item.productName,
          quantity: parseNumber(item.quantity),
          unit: item.unit,
          rate: parseNumber(item.rate),
          amount: parseNumber(item.amount),
        })),
        transportCost: parseNumber(form.transportCost),
        loadingCost: parseNumber(form.loadingCost),
        labourCost: parseNumber(form.labourCost),
        taxAmount: parseNumber(form.taxAmount),
        discountAmount: parseNumber(form.discountAmount),
        cashAmount: parseNumber(form.cashAmount),
        bankAmount: parseNumber(form.bankAmount),
        cashAccountId: form.cashAccountId ? parseInt(form.cashAccountId, 10) : null,
        bankAccountId: form.bankAccountId ? parseInt(form.bankAccountId, 10) : null,
        vehicleNumber: form.vehicleNumber || null,
        driverName: form.driverName || null,
        notes: form.notes || null,
        correctionReason: reason,
      };

      const res = await fetch(`/api/purchases/${correctId}/correct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        showToast(`Bill ${correctionBillNumber || data.purchase?.purchaseNumber || ""} corrected`, "success");
        router.push(`/purchases/${correctId}`);
      } else {
        showToast(data.error || "Failed to correct bill", "error");
      }
    } catch {
      showToast("Error processing request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (status) => {
    if (!form.vendorId) {
      showToast(`Please select a ${vendorType === "company" ? "vendor" : vendorType}`, "warning");
      return;
    }
    const vendorName = selectedVendor?.name?.trim();
    if (!vendorName) {
      showToast("Could not resolve supplier name", "error");
      return;
    }
    if (cartItems.length === 0) {
      showToast("Add at least one item to the cart", "warning");
      return;
    }

    const notesParts = [];
    if (form.supplierInvoiceRef.trim()) {
      notesParts.push(`Vendor invoice: ${form.supplierInvoiceRef.trim()}`);
    }
    if (form.notes.trim()) notesParts.push(form.notes.trim());
    const notes = notesParts.join("\n") || null;

    setSubmitting(true);
    try {
      const payload = {
        vendorName,
        farmerId: vendorType === "farmer" ? parseInt(form.vendorId, 10) : null,
        companyId: vendorType === "company" ? parseInt(form.vendorId, 10) : null,
        purchaseDate: form.purchaseDate,
        items: cartItems.map((item) => ({
          productId: parseInt(item.productId, 10),
          productName: item.productName,
          quantity: parseNumber(item.quantity),
          unit: item.unit,
          rate: parseNumber(item.rate),
          amount: parseNumber(item.amount),
        })),
        transportCost: parseNumber(form.transportCost),
        loadingCost: parseNumber(form.loadingCost),
        labourCost: parseNumber(form.labourCost),
        taxAmount: parseNumber(form.taxAmount),
        discountAmount: parseNumber(form.discountAmount),
        cashAmount: parseNumber(form.cashAmount),
        bankAmount: parseNumber(form.bankAmount),
        cashAccountId: form.cashAccountId ? parseInt(form.cashAccountId, 10) : null,
        bankAccountId: form.bankAccountId ? parseInt(form.bankAccountId, 10) : null,
        vehicleNumber: form.vehicleNumber || null,
        driverName: form.driverName || null,
        notes,
        status,
      };

      const res = isEdit
        ? await fetch(`/api/purchases/${editId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/purchases", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const data = await res.json();

      if (res.ok) {
        const poId = data.purchase?.id || editId;
        showToast(status === "confirmed" ? "Purchase confirmed" : "Draft saved", "success");
        if (status === "confirmed") {
          router.push(`/purchases?bill=${poId}`);
        } else {
          router.push("/purchases");
        }
      } else {
        showToast(data.error || "Failed to save purchase", "error");
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
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-enter pb-8 erp-purchases-page space-y-5 sm:space-y-6">
      <PageHeader
        module="purchases"
        title={
          isCorrection
            ? `Correct bill · ${correctionBillNumber || "…"}`
            : isEdit
              ? "Edit purchase order"
              : "New purchase order"
        }
        description={
          isCorrection
            ? "Update line items, charges, or payment. Stock and ledger will be re-posted."
            : "Vendor, items, settlement, and payment."
        }
        icon={ShoppingCart}
        breadcrumbs={
          isCorrection
            ? [
                { label: "Purchase Orders", href: "/purchases" },
                { label: correctionBillNumber || "Bill", href: correctId ? `/purchases/${correctId}` : "/purchases" },
                { label: "Correct" },
              ]
            : [{ label: "Purchase Orders", href: "/purchases" }, { label: isEdit ? "Edit" : "New bill" }]
        }
        actions={
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-2 w-full sm:w-auto">
            <Link
              href={isCorrection && correctId ? `/purchases/${correctId}` : "/purchases"}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200/90 bg-white text-sm font-medium text-slate-600 hover:text-blue-700 hover:border-blue-200 hover:bg-blue-50/60 transition-all duration-200 ease-out"
            >
              <ArrowLeft className="w-4 h-4" /> {isCorrection ? "Back to bill" : "Back to list"}
            </Link>
            <div className="w-full sm:w-[9.5rem]">
              <FieldLabel>Bill date</FieldLabel>
              <input
                type="date"
                value={form.purchaseDate}
                onChange={handleChange("purchaseDate")}
                className="input-field w-full min-h-[40px] text-sm"
              />
            </div>
          </div>
        }
      />

      {isCorrection && (
        <div className="erp-doc-section p-4 sm:p-5 rounded-xl border border-amber-200/90 bg-gradient-to-br from-amber-50/90 to-orange-50/40">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <p className="text-sm font-semibold text-amber-950">Bill correction mode</p>
                <p className="text-xs text-amber-900/75 mt-1 leading-relaxed">
                  You are correcting a posted purchase bill. Stock movements and ledger entries will be reversed, then
                  re-applied with your changes. The bill number stays the same.
                </p>
              </div>
              <div>
                <FieldLabel className="text-amber-900/70">Reason for correction *</FieldLabel>
                <textarea
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  rows={2}
                  placeholder="e.g. Wrong quantity entered for Item X"
                  className="input-field w-full text-sm bg-white/90 border-amber-200/80 focus:border-amber-400"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vendor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DocSection title="Vendor" className="overflow-visible">
          <div className="erp-doc-body space-y-4 overflow-visible">
            <div
              className={`erp-vendor-switch grid ${legacyVendorType ? "grid-cols-2" : "hidden"} gap-2 p-1.5 rounded-xl bg-[var(--surface-2)] border border-[var(--line)]`}
              role="tablist"
              aria-label="Vendor type"
            >
              {legacyVendorType && (
              <button
                type="button"
                role="tab"
                aria-selected={vendorType === "farmer"}
                onClick={() => {
                  setVendorType("farmer");
                  setForm({ ...form, vendorId: "" });
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all duration-300 ease-out cursor-pointer select-none ${
                  vendorType === "farmer"
                    ? "bg-[var(--brand)] text-white shadow-sm"
                    : "text-[var(--ink-2)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
                }`}
              >
                <Sprout
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    vendorType === "farmer" ? "text-white" : "text-emerald-600"
                  }`}
                  strokeWidth={2.25}
                />
                Farmer (legacy)
              </button>
              )}
              <button
                type="button"
                role="tab"
                aria-selected={vendorType === "company"}
                onClick={() => {
                  setVendorType("company");
                  setForm({ ...form, vendorId: "" });
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all duration-300 ease-out cursor-pointer select-none ${
                  vendorType === "company"
                    ? "bg-[var(--brand)] text-white shadow-sm"
                    : "text-[var(--ink-2)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
                }`}
              >
                <Building2
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    vendorType === "company" ? "text-white" : "text-[var(--ink-3)]"
                  }`}
                  strokeWidth={2.25}
                />
                Vendor
              </button>
            </div>
            <SearchPicker
              label="Vendor *"
              placeholder={`Search ${vendorType === "farmer" ? "farmers" : "vendors"}…`}
              options={vendorOptions}
              value={form.vendorId}
              onChange={(id) => setForm({ ...form, vendorId: id })}
              getOptionLabel={(v) => v.name}
              labelClassName={
                vendorType === "farmer" ? "text-emerald-800/80" : "text-amber-900/70"
              }
              fieldClassName={
                vendorType === "farmer"
                  ? "!focus-within:border-emerald-500 !focus-within:shadow-[0_0_0_2px_rgba(16,185,129,0.2)]"
                  : "!focus-within:border-amber-500 !focus-within:shadow-[0_0_0_2px_rgba(245,158,11,0.25)]"
              }
              renderOption={(v) => (
                <span>
                  {v.name}
                  {v.phone ? <span className="text-slate-400 text-xs ml-2">{v.phone}</span> : null}
                  {v.city ? <span className="text-slate-400 text-xs ml-1">· {v.city}</span> : null}
                </span>
              )}
            />
            {form.vendorId ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div
                  className={`rounded-lg border px-3 py-2.5 transition-colors duration-200 ${
                    vendorType === "farmer"
                      ? "border-emerald-200/90 bg-emerald-50/50"
                      : "border-amber-200/90 bg-amber-50/45"
                  }`}
                >
                  <p
                    className={`text-[10px] font-medium uppercase mb-1 ${
                      vendorType === "farmer" ? "text-emerald-800/55" : "text-amber-900/50"
                    }`}
                  >
                    Previous balance
                  </p>
                  <Money value={vendorPreviousBalance} strong />
                </div>
                <div className="rounded-lg border border-slate-200/80 bg-white px-3 py-2.5 shadow-sm">
                  <p className="text-[10px] font-medium uppercase text-slate-400 mb-1">After this bill</p>
                  <Money value={vendorProjectedBalance} strong />
                </div>
              </div>
            ) : null}
          </div>
        </DocSection>

        <DocSection title="Reference & delivery">
          <div className="erp-doc-body space-y-3.5">
            <div>
              <FieldLabel>Vendor invoice / reference</FieldLabel>
              <input
                type="text"
                value={form.supplierInvoiceRef}
                onChange={handleChange("supplierInvoiceRef")}
                placeholder="Optional bill number"
                className="input-field w-full min-h-[42px]"
              />
            </div>
            <FleetVehicleDriverFields
              vehicleNumber={form.vehicleNumber}
              driverName={form.driverName}
              onVehicleNumberChange={(value) => setForm((f) => ({ ...f, vehicleNumber: value }))}
              onDriverNameChange={(value) => setForm((f) => ({ ...f, driverName: value }))}
            />
          </div>
        </DocSection>
      </div>

      {/* Line items — single aligned table */}
      <DocSection
        title="Line items"
        meta={
          <span>
            {cartItems.length} {cartItems.length === 1 ? "line" : "lines"} · Subtotal{" "}
            <Money value={subtotal} strong />
          </span>
        }
        className="overflow-visible"
      >
        <div className="overflow-x-auto overflow-y-visible">
          <table className="erp-line-table w-full min-w-[760px]">
            <thead>
              <tr>
                <th className="text-left pl-4">Item</th>
                <th className="text-right w-[120px]">Qty</th>
                <th className="text-right w-[110px]">Rate</th>
                <th className="text-right w-[110px]">Cost rate</th>
                <th className="text-right w-[110px]">Amount</th>
                <th className="w-11 pr-3" aria-hidden />
              </tr>
            </thead>
            <tbody>
              <tr className="erp-add-row">
                <td className="pl-4 min-w-[200px]">
                  <SearchPicker
                    hideLabel
                    label="Product"
                    placeholder="Search item or SKU…"
                    options={products}
                    value={lineEntry.productId}
                    onChange={onLineProductChange}
                    getOptionLabel={(p) => `${p.name} (${p.unit || "unit"})`}
                    renderOption={(p) => (
                      <span>
                        {p.name}{" "}
                        <span className="text-slate-400 text-xs">
                          {p.sku ? `${p.sku} · ` : ""}
                          {p.unit}
                        </span>
                      </span>
                    )}
                  />
                </td>
                <td className="text-right">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={lineEntry.quantity}
                    onChange={(e) => setLineEntry({ ...lineEntry, quantity: e.target.value })}
                    className="input-field-compact w-full text-right tabular-nums"
                    placeholder="0"
                    aria-label="Quantity"
                  />
                </td>
                <td className="text-right">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={lineEntry.rate}
                    onChange={(e) => setLineEntry({ ...lineEntry, rate: e.target.value })}
                    className="input-field-compact w-full text-right tabular-nums"
                    placeholder="0"
                    aria-label="Rate"
                  />
                </td>
                <td className="text-right">
                  <Money
                    value={lineRate > 0 || chargePerUnit > 0 ? lineCostRate : null}
                    muted
                    emptyIfZero
                  />
                </td>
                <td className="text-right">
                  <Money value={lineTotal > 0 ? lineTotal : null} strong emptyIfZero />
                </td>
                <td className="pr-3 text-center">
                  <button
                    type="button"
                    onClick={addToCart}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 cursor-pointer"
                    title="Add line"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </td>
              </tr>
              {cartItems.map((item, idx) => (
                <tr key={`${item.productId}-${idx}`} className="erp-data-row">
                  <td className="pl-4 font-semibold text-slate-900 text-sm">{item.productName}</td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => updateCartItem(idx, "quantity", e.target.value)}
                        className="input-field-compact w-[72px] text-right tabular-nums"
                        aria-label={`Quantity for ${item.productName}`}
                      />
                      <span className="text-[11px] text-slate-500 w-9 truncate">{item.unit}</span>
                    </div>
                  </td>
                  <td className="text-right">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={item.rate}
                      onChange={(e) => updateCartItem(idx, "rate", e.target.value)}
                      className="input-field-compact w-full text-right tabular-nums"
                      aria-label={`Rate for ${item.productName}`}
                    />
                  </td>
                  <td className="text-right">
                    <Money
                      value={cartItemCostRate(item) > 0 ? cartItemCostRate(item) : null}
                      muted
                      emptyIfZero
                    />
                  </td>
                  <td className="text-right">
                    <Money value={item.amount} strong />
                  </td>
                  <td className="pr-3 text-center">
                    <button
                      type="button"
                      onClick={() => removeFromCart(idx)}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 active:scale-[0.98] transition-all duration-200 cursor-pointer"
                      aria-label="Remove line"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {cartItems.length > 0 ? (
              <tfoot>
                <tr className="bg-blue-50/40 border-t border-blue-100">
                  <td colSpan={4} className="pl-4 py-2 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    Merchandise subtotal
                  </td>
                  <td className="text-right py-2.5 pr-3">
                    <Money value={subtotal} strong />
                  </td>
                  <td />
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
        {cartItems.length === 0 ? (
          <p className="text-center py-8 text-sm text-slate-400 border-t border-blue-100">
            Add items using the row above. Cost rate includes shared charges ÷ total quantity.
          </p>
        ) : null}
      </DocSection>

      <DocSection
        title="Bill & settlement"
        meta={
          <span className="inline-flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 text-slate-400" />
            Document total <Money value={totalAmount} strong />
          </span>
        }
      >
        <div className="erp-settlement">
          <div className="erp-settlement-grid">
            {/* Charge inputs */}
            <div className="erp-settlement-charges">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-3">
                Additional charges
              </p>
              <div className="space-y-3">
                {[
                  { field: "transportCost", label: "Transport / freight" },
                  { field: "loadingCost", label: "Loading" },
                  { field: "labourCost", label: "Service labour" },
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
                      placeholder="0.00"
                    />
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[11px] text-slate-400 leading-relaxed border-t border-blue-100/80 pt-3">
                Charges are allocated across line quantities for cost rate on each item.
              </p>
            </div>

            {/* Bill computation + payment */}
            <div className="erp-settlement-main space-y-4">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {/* Bill summary */}
                <div className="erp-summary-block">
                  <div className="erp-summary-block-title">Bill summary</div>
                  <SummaryRow label="Merchandise subtotal" value={subtotal} />
                  <SummaryRow label="Transport / freight" value={parseNumber(form.transportCost)} />
                  <SummaryRow label="Loading" value={parseNumber(form.loadingCost)} />
                  <SummaryRow label="Service labour" value={parseNumber(form.labourCost)} />
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
                      aria-label="Discount amount"
                    />
                  </div>
                  <SummaryRow label="Amount payable" value={totalAmount} grand />
                </div>

                {/* Payment allocation */}
                <div className="erp-summary-block">
                  <div className="erp-summary-block-title">Payment allocation</div>
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
                        className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 cursor-pointer underline-offset-2 hover:underline"
                      >
                        Apply full balance to cash
                      </button>
                      <span className="text-[11px] text-slate-500">
                        Due after payment: <Money value={balanceDue} strong className="text-blue-800" />
                      </span>
                    </div>
                  </div>
                  <SummaryRow label="Total payment on this bill" value={paidAmount} bold />
                  <SummaryRow label="Outstanding on this bill">
                    <Money
                      value={balanceDue}
                      strong
                      className={balanceDue > 0 ? "text-blue-800" : "text-emerald-700"}
                    />
                  </SummaryRow>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="erp-doc-actions flex flex-col-reverse sm:flex-row sm:justify-end">
          {isCorrection ? (
            <>
              <Link href={correctId ? `/purchases/${correctId}` : "/purchases"}>
                <Button
                  type="button"
                  disabled={submitting}
                  variant="outline"
                  className="min-h-[42px] sm:min-w-[140px] bg-white border-slate-200/90 text-slate-700 shadow-none rounded-lg"
                >
                  Cancel
                </Button>
              </Link>
              <Button
                type="button"
                disabled={submitting || correctionReason.trim().length < 3}
                variant="primary"
                onClick={handleCorrectionSubmit}
                className="min-h-[42px] sm:min-w-[220px]"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Apply correction
              </Button>
            </>
          ) : (
            <>
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
                variant="primary"
                onClick={() => handleSubmit("confirmed")}
                className="min-h-[42px] sm:min-w-[200px] rounded-lg shadow-md transition-all duration-200 active:scale-[0.99]"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Post bill
              </Button>
            </>
          )}
        </div>
      </DocSection>
    </div>
  );
}

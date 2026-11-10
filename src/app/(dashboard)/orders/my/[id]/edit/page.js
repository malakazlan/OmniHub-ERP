"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { mustScopeOrdersToSelf } from "@/lib/ordersNav";
import { useToast } from "@/context/ToastContext";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { parseNumber, formatCurrency } from "@/lib/formatters";
import SearchPicker from "@/components/ui/SearchPicker";

const EMPTY_ITEM = { productId: "", quantity: "", rate: "", amount: 0 };

export default function MyEditOrderPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [customerType, setCustomerType] = useState("shop");
  const [shops, setShops] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ customerId: "", orderDate: "", notes: "" });
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);

  useEffect(() => {
    if (!authLoading && user && !mustScopeOrdersToSelf(user)) {
      router.replace(`/orders/${id}/edit`);
    }
  }, [authLoading, user, router, id]);

  useEffect(() => {
    Promise.all([
      fetch("/api/shops").then((r) => r.json()),
      fetch("/api/companies").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
      fetch(`/api/orders/${id}`).then((r) => r.json()),
    ])
      .then(([s, c, p, o]) => {
        setShops(s.shops || []);
        setCompanies(c.companies || []);
        setProducts(p.products || []);
        const order = o.order;
        if (!order) return;
        setCustomerType(order.shopId ? "shop" : "company");
        setForm({
          customerId: String(order.shopId || order.companyId || ""),
          orderDate: order.orderDate?.slice(0, 10) || "",
          notes: order.notes || "",
        });
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
      })
      .finally(() => setLoading(false));
  }, [id]);

  const customerOptions = customerType === "shop" ? shops : companies;

  const updateItem = (index, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === "productId") {
        const product = products.find((p) => String(p.id) === String(value));
        if (product) next[index].rate = product.salePrice != null ? String(product.salePrice) : "";
      }
      next[index].amount = parseNumber(next[index].quantity) * parseNumber(next[index].rate);
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const customer = customerOptions.find((c) => String(c.id) === String(form.customerId));
    const validItems = items.filter((i) => i.productId && parseNumber(i.quantity) > 0);
    if (!validItems.length || !form.customerId) {
      showToast("Complete customer and lines", "warning");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
              unit: product?.unit || "ea",
              rate: parseNumber(item.rate),
              amount: parseNumber(item.amount),
            };
          }),
          notes: form.notes || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Order updated", "success");
        router.push(`/orders/my/${id}`);
      } else showToast(data.error || "Failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-9 h-9 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="page-enter max-w-lg mx-auto pb-32">
      <div className="flex items-center gap-2 mb-4">
        <Link href={`/orders/my/${id}`} className="sp-back-btn">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-slate-900">Edit order</h1>
      </div>

      <div className="sp-section-card">
        <SearchPicker
          label={customerType === "shop" ? "Shop" : "Company"}
          options={customerOptions}
          value={form.customerId}
          onChange={(cid) => setForm({ ...form, customerId: cid })}
          getOptionLabel={(c) => c.name}
        />
      </div>

      <div className="sp-section-card mt-3 space-y-3">
        {items.map((item, index) => (
          <div key={index} className="sp-line-card">
            <select
              className="input-field w-full min-h-[44px]"
              value={item.productId}
              onChange={(e) => updateItem(index, "productId", e.target.value)}
            >
              <option value="">Item</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <input
                type="number"
                className="input-field min-h-[44px]"
                placeholder="Qty"
                value={item.quantity}
                onChange={(e) => updateItem(index, "quantity", e.target.value)}
              />
              <div className="flex items-center min-h-[44px] px-3 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-600">
                Rate: <span className="ml-1 font-semibold text-slate-900">{formatCurrency(parseNumber(item.rate))}</span>
              </div>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="font-bold text-sm">{formatCurrency(item.amount || 0)}</span>
              <button type="button" onClick={() => items.length > 1 && setItems(items.filter((_, i) => i !== index))}>
                <Trash2 className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setItems([...items, { ...EMPTY_ITEM }])}
          className="w-full py-2 text-sm font-semibold text-orange-700 flex items-center justify-center gap-1"
        >
          <Plus className="w-4 h-4" /> Add line
        </button>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white/90 backdrop-blur-md border-t">
        <div className="max-w-lg mx-auto">
          <button type="submit" disabled={submitting} className="sp-submit-btn w-full">
            {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Save changes"}
          </button>
        </div>
      </div>
    </form>
  );
}

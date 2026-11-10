"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/Button";
import SearchPicker from "@/components/ui/SearchPicker";
import { ClipboardList, Loader2, Plus, Trash2, ArrowLeft } from "lucide-react";
import { parseNumber } from "@/lib/formatters";
import { CURRENCY_SYMBOL } from "@/lib/constants";

const EMPTY_ITEM = { productId: "", quantity: "", rate: "", amount: 0 };

export default function EditOrderPage() {
  const { id } = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [customerType, setCustomerType] = useState("shop");
  const [shops, setShops] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    customerId: "",
    orderDate: "",
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
      fetch(`/api/orders/${id}`).then((r) => r.json()),
    ])
      .then(([s, c, p, o]) => {
        setShops(s.shops || []);
        setCompanies(c.companies || []);
        setProducts(p.products || []);
        const order = o.order;
        if (!order) return;
        const type = order.shopId ? "shop" : "company";
        setCustomerType(type);
        setForm({
          customerId: String(order.shopId || order.companyId || ""),
          orderDate: order.orderDate?.slice(0, 10) || "",
          transportCost: order.transportCost ? String(order.transportCost) : "",
          loadingCost: order.loadingCost ? String(order.loadingCost) : "",
          taxAmount: order.taxAmount ? String(order.taxAmount) : "",
          discountAmount: order.discountAmount ? String(order.discountAmount) : "",
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
      .catch(() => showToast("Error loading order", "error"))
      .finally(() => setLoading(false));
  }, [id, showToast]);

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
          transportCost: parseNumber(form.transportCost),
          loadingCost: parseNumber(form.loadingCost),
          taxAmount: parseNumber(form.taxAmount),
          discountAmount: parseNumber(form.discountAmount),
          notes: form.notes || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Order updated", "success");
        router.push(`/orders/${id}`);
      } else showToast(data.error || "Failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-72 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="page-enter pb-8 space-y-6">
      <PageHeader
        module="orders"
        title="Edit order"
        icon={ClipboardList}
        breadcrumbs={[{ label: "Sales Orders", href: "/orders" }, { label: "Edit" }]}
        actions={
          <Link href={`/orders/${id}`} className="inline-flex items-center gap-2 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
        }
      />
      <SearchPicker
        label={customerType === "shop" ? "Shop" : "Company"}
        options={customerOptions}
        value={form.customerId}
        onChange={(cid) => setForm({ ...form, customerId: cid })}
        getOptionLabel={(c) => c.name}
      />
      <div className="overflow-x-auto border rounded-xl p-4">
        <table className="w-full min-w-[640px] text-sm">
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td className="py-1 pr-2">
                  <select className="input-field-compact w-full" value={item.productId} onChange={(e) => updateItem(index, "productId", e.target.value)}>
                    <option value="">Item</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </td>
                <td><input type="number" className="input-field-compact w-24" value={item.quantity} onChange={(e) => updateItem(index, "quantity", e.target.value)} /></td>
                <td><input type="number" className="input-field-compact w-28" value={item.rate} onChange={(e) => updateItem(index, "rate", e.target.value)} /></td>
                <td className="text-right font-mono text-xs">{CURRENCY_SYMBOL}{parseNumber(item.amount).toLocaleString()}</td>
                <td><button type="button" onClick={() => items.length > 1 && setItems(items.filter((_, i) => i !== index))}><Trash2 className="w-4 h-4 text-slate-400" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" onClick={() => setItems([...items, { ...EMPTY_ITEM }])} className="mt-2 text-xs text-orange-700"><Plus className="w-4 h-4 inline" /> Line</button>
        <p className="text-right font-bold mt-2">{CURRENCY_SYMBOL}{totalAmount.toLocaleString()}</p>
      </div>
      <Button type="submit" disabled={submitting} className="bg-orange-600 border-0">Save changes</Button>
    </form>
  );
}

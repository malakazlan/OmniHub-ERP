"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/Button";
import ProductForm from "@/components/products/ProductForm";
import RegisterPrintView from "@/components/reports/RegisterPrintView";
import RegisterExportToolbar from "@/components/reports/RegisterExportToolbar";
import { useRegisterExport } from "@/hooks/useRegisterExport";
import {
  Package, Loader2, ArrowLeft, Pencil, Trash2, AlertTriangle, Boxes, DollarSign, TrendingUp,
} from "lucide-react";
import { formatCurrency, formatQuantity, formatDateTime } from "@/lib/formatters";

const MOVEMENT_LABELS = {
  purchase_in: "Purchase in",
  sale_out: "Sale out",
  return_in: "Return in",
  return_out: "Return out",
  adjustment: "Adjustment",
  transfer: "Transfer",
};

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  const printRef = useRef(null);

  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(null);
  const [companySettings, setCompanySettings] = useState(null);

  const fetchProduct = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch(`/api/products/${id}`),
        fetch("/api/products/categories"),
      ]);
      const data = await prodRes.json();
      const catData = await catRes.json();
      if (prodRes.ok) setProduct(data.product);
      else showToast(data.error || "Failed to load item", "error");
      if (catRes.ok) setCategories(catData.categories || []);
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchProduct();
    fetch("/api/settings").then((r) => r.json()).then((d) => { if (d.settings) setCompanySettings(d.settings); }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const movements = product?.stockMovements || [];
  const printCols = useMemo(
    () => [
      { key: "date", label: "Date", get: (r) => formatDateTime(r.createdAt), pdfWidth: 38 },
      { key: "type", label: "Type", get: (r) => MOVEMENT_LABELS[r.movementType] || r.movementType, pdfWidth: 28 },
      { key: "qty", label: "Qty", align: "right", pdfWidth: 22, get: (r) => formatQuantity(r.quantity, product?.unit) },
      {
        key: "range",
        label: "Before → After",
        pdfWidth: 40,
        get: (r) => `${formatQuantity(r.previousStock, product?.unit)} → ${formatQuantity(r.newStock, product?.unit)}`,
      },
      { key: "notes", label: "Notes", get: (r) => r.notes || "—", pdfWidth: 50 },
    ],
    [product?.unit]
  );

  const { pdfLoading, onPrint, onExportPdf } = useRegisterExport({
    printRef,
    title: product ? `Item — ${product.name}` : "Product",
    subtitle: product?.sku ? `SKU ${product.sku}` : "",
    company: companySettings,
    columns: printCols,
    rows: movements,
    filename: product ? `item-${product.sku || product.id}.pdf` : "item.pdf",
  });

  const openEdit = () => {
    setForm({
      name: product.name || "", categoryId: product.categoryId || "", unit: product.unit || "ea",
      bagWeight: product.bagWeight ?? "34", costPrice: product.costPrice ?? "", salePrice: product.salePrice ?? "",
      minimumStock: product.minimumStock ?? "", currentStock: product.currentStock ?? "",
      description: product.description || "", isActive: product.isActive,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Item updated!", "success");
        setModalOpen(false);
        fetchProduct();
      } else showToast(data.error || "Failed to update", "error");
    } catch {
      showToast("Error processing request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete item "${product.name}"?`)) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "Item removed", "success");
        router.push("/products");
      } else showToast(data.error || "Failed to delete", "error");
    } catch {
      showToast("Error processing request", "error");
    }
  };

  if (loading) {
    return <div className="h-96 flex items-center justify-center erp-products-surface"><Loader2 className="w-8 h-8 text-violet-600 animate-spin" /></div>;
  }

  if (!product) {
    return (
      <div className="erp-products-surface p-8 text-center">
        <p className="text-slate-500 mb-4">Item not found</p>
        <Link href="/products"><Button variant="outline"><ArrowLeft className="w-4 h-4" /> Back</Button></Link>
      </div>
    );
  }

  const isLow = product.currentStock <= product.minimumStock;
  const stockValue = (product.currentStock || 0) * (product.costPrice || 0);

  return (
    <div className="erp-products-surface page-enter pb-8">
      <div className="erp-products-page space-y-5">
        <Link href="/products" className="erp-ac-back-link"><ArrowLeft className="w-3.5 h-3.5" /> Items</Link>

        <div className="erp-prod-detail-panel">
          <div className="erp-prod-detail-head">
            <div>
              <h1 className="erp-prod-page-title">{product.name}</h1>
              <div className="erp-prod-detail-meta">
                <span>{product.sku || "No SKU"}</span>
                <span>{product.category?.name}</span>
                <span className={product.isActive ? "text-emerald-700" : "text-slate-500"}>{product.isActive ? "Active" : "Inactive"}</span>
              </div>
            </div>
            <div className="erp-prod-detail-actions">
              <Button variant="outline" onClick={openEdit} className="border-slate-200"><Pencil className="w-4 h-4" /> Edit</Button>
              {user?.role === "admin" && (
                <Button variant="outline" onClick={handleDelete} className="border-red-200 text-red-600"><Trash2 className="w-4 h-4" /> Delete</Button>
              )}
            </div>
          </div>

          <div className="erp-prod-stats erp-prod-stats-inline">
            <div className="erp-prod-stat"><p className="erp-prod-stat-label">Stock</p><p className={`erp-prod-stat-value ${isLow ? "text-red-600" : "text-emerald-700"}`}>{formatQuantity(product.currentStock, product.unit)}</p></div>
            <div className="erp-prod-stat"><p className="erp-prod-stat-label">Cost</p><p className="erp-prod-stat-value">{formatCurrency(product.costPrice)}</p></div>
            <div className="erp-prod-stat"><p className="erp-prod-stat-label">Sale</p><p className="erp-prod-stat-value">{formatCurrency(product.salePrice)}</p></div>
            <div className="erp-prod-stat"><p className="erp-prod-stat-label">Stock value</p><p className="erp-prod-stat-value">{formatCurrency(stockValue)}</p></div>
          </div>

          <div className="erp-prod-detail-info">
            <div><span className="label">Unit</span><span>{product.unit}</span></div>
            {(product.unit === "case" || product.unit === "bag") && <div><span className="label">Units per case</span><span>{product.bagWeight || 34}</span></div>}
            <div><span className="label">Min stock</span><span>{formatQuantity(product.minimumStock, product.unit)}</span></div>
            {isLow && <div className="erp-prod-low-banner"><AlertTriangle className="w-4 h-4" /> Below minimum stock threshold</div>}
            {product.description && <div className="erp-prod-desc"><span className="label">Description</span><p>{product.description}</p></div>}
          </div>
        </div>

        <div className="erp-prod-register">
          <div className="erp-prod-register-head">
            <div>
              <p className="erp-prod-register-title flex items-center gap-2"><Boxes className="w-4 h-4 text-violet-600" /> Stock movements</p>
              <p className="erp-prod-register-meta">{movements.length} entries</p>
            </div>
            <RegisterExportToolbar onPrint={onPrint} onExportPdf={onExportPdf} pdfLoading={pdfLoading} disabled={movements.length === 0} resultCount={movements.length} label="movements" />
          </div>

          {movements.length === 0 ? (
            <div className="erp-ac-empty py-12 text-center text-sm text-slate-500">No stock movements recorded yet.</div>
          ) : (
            <div className="erp-accounts-grid-wrap">
              <div className="erp-accounts-grid-scroll">
                <table className="erp-ledger-grid erp-prod-grid">
                  <thead>
                    <tr>
                      <th className="erp-lg-th erp-prod-th">Date</th>
                      <th className="erp-lg-th erp-prod-th">Type</th>
                      <th className="erp-lg-th erp-prod-th erp-lg-th-money">Quantity</th>
                      <th className="erp-lg-th erp-prod-th">Before → After</th>
                      <th className="erp-lg-th erp-prod-th">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m) => (
                      <tr key={m.id} className="erp-lg-row">
                        <td className="erp-lg-td erp-lg-td-date">{formatDateTime(m.createdAt)}</td>
                        <td className="erp-lg-td"><span className="erp-prod-move-pill">{MOVEMENT_LABELS[m.movementType] || m.movementType}</span></td>
                        <td className="erp-lg-td erp-lg-td-money">{formatQuantity(m.quantity, product.unit)}</td>
                        <td className="erp-lg-td text-xs font-mono text-slate-600">{formatQuantity(m.previousStock, product.unit)} → {formatQuantity(m.newStock, product.unit)}</td>
                        <td className="erp-lg-td text-xs text-slate-500">{m.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {form && (
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Edit item" size="lg">
          <ProductForm form={form} onChange={setForm} categories={categories} submitting={submitting} onSubmit={handleSubmit} onCancel={() => setModalOpen(false)} submitLabel="Save changes" />
        </Modal>
      )}

      <div className="erp-register-print-host" aria-hidden>
        <RegisterPrintView ref={printRef} title={`Item — ${product.name}`} subtitle={`SKU ${product.sku || "—"} · Stock ${formatQuantity(product.currentStock, product.unit)}`} company={companySettings} columns={printCols} rows={movements} />
      </div>
    </div>
  );
}

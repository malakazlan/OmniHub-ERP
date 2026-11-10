"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import ProductsRegister from "@/components/products/ProductsRegister";
import RegisterPrintView from "@/components/reports/RegisterPrintView";
import RegisterExportToolbar from "@/components/reports/RegisterExportToolbar";
import { useRegisterExport } from "@/hooks/useRegisterExport";
import { Button } from "@/components/Button";
import {
  Package, Loader2, ArrowLeft, AlertTriangle, Boxes, DollarSign, Search,
} from "lucide-react";
import { formatCurrency, formatQuantity } from "@/lib/formatters";

function inventoryColumns() {
  return [
    { key: "num", label: "#", get: (_r, i) => i + 1, pdfWidth: 8, align: "center" },
    { key: "name", label: "Product", get: (r) => r.name, pdfWidth: 36 },
    { key: "sku", label: "SKU", get: (r) => r.sku || "—", pdfWidth: 16 },
    { key: "category", label: "Category", get: (r) => r.category?.name || "—", pdfWidth: 24 },
    {
      key: "stock",
      label: "Stock",
      align: "right",
      pdfWidth: 20,
      get: (r) => formatQuantity(r.currentStock, r.unit),
      tone: (r) => (r.isLow ? "danger" : undefined),
    },
    {
      key: "min",
      label: "Min",
      align: "right",
      pdfWidth: 16,
      get: (r) => formatQuantity(r.minimumStock, r.unit),
    },
    {
      key: "cost",
      label: "Cost",
      align: "right",
      pdfWidth: 22,
      get: (r) => formatCurrency(r.costPrice),
    },
    {
      key: "sale",
      label: "Sale price",
      align: "right",
      pdfWidth: 22,
      get: (r) => formatCurrency(r.salePrice),
    },
    {
      key: "value",
      label: "Stock value",
      align: "right",
      pdfWidth: 28,
      get: (r) => formatCurrency(r.stockValue),
      bold: true,
    },
  ];
}

export default function InventoryReportPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const printRef = useRef(null);
  const [summary, setSummary] = useState({ count: 0, totalStockValue: 0, lowStockCount: 0 });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [companySettings, setCompanySettings] = useState(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch("/api/reports/inventory");
        const data = await res.json();
        if (res.ok) {
          setSummary(data.summary || {});
          setProducts(data.products || []);
        } else showToast(data.error || "Failed to load inventory report", "error");
      } catch {
        showToast("Error connecting to server", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
    fetch("/api/settings").then((r) => r.json()).then((d) => { if (d.settings) setCompanySettings(d.settings); }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.category?.name?.toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  const cols = useMemo(() => inventoryColumns(), []);
  const filteredTotal = filtered.reduce((s, p) => s + (p.stockValue || 0), 0);

  const printColumns = cols.filter((c) => c.key !== "num").map((c) => ({
    ...c,
    get: (r, i) => {
      const val = c.get ? c.get(r, i) : r[c.key];
      if (c.tone === "danger" || (typeof c.tone === "function" && c.tone(r))) return val;
      return val;
    },
  }));

  const { pdfLoading, onPrint, onExportPdf } = useRegisterExport({
    printRef,
    title: "Inventory Report",
    subtitle: `Stock valuation · ${summary.lowStockCount} low-stock alerts`,
    company: companySettings,
    columns: printColumns,
    rows: filtered,
    footers: [{
      label: "Total stock value",
      value: formatCurrency(filteredTotal),
      valueColumn: "value",
      labelColumn: "cost",
    }],
    filename: `inventory-report-${new Date().toISOString().slice(0, 10)}.pdf`,
    emptyMessage: "No items to export",
  });

  if (loading && products.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center erp-products-surface">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="erp-products-surface page-enter pb-8">
      <div className="erp-products-page space-y-5">
        <header className="erp-prod-page-header">
          <div>
            <div className="erp-prod-page-badge">
              <Package className="w-3.5 h-3.5" />
              Inventory report
            </div>
            <h1 className="erp-prod-page-title">Stock & valuation</h1>
            <p className="erp-prod-page-desc">Live stock levels, cost valuation, and low-stock alerts across all active items.</p>
          </div>
          <div className="erp-fin-header-actions">
            <Link href="/products">
              <Button variant="outline" className="border-slate-200 text-slate-600">
                <Package className="w-4 h-4" /> Items
              </Button>
            </Link>
            <Link href="/reports">
              <Button variant="outline" className="border-slate-200 text-slate-600">
                <ArrowLeft className="w-4 h-4" /> Reports
              </Button>
            </Link>
          </div>
        </header>

        <div className="erp-prod-stats">
          <div className="erp-prod-stat">
            <div className="erp-prod-stat-icon"><Boxes className="w-4 h-4" /></div>
            <div>
              <p className="erp-prod-stat-label">Active items</p>
              <p className="erp-prod-stat-value">{summary.count}</p>
            </div>
          </div>
          <div className="erp-prod-stat">
            <div className="erp-prod-stat-icon"><DollarSign className="w-4 h-4" /></div>
            <div>
              <p className="erp-prod-stat-label">Total stock value</p>
              <p className="erp-prod-stat-value">{formatCurrency(summary.totalStockValue)}</p>
            </div>
          </div>
          <div className="erp-prod-stat erp-prod-stat-warn">
            <div className="erp-prod-stat-icon"><AlertTriangle className="w-4 h-4" /></div>
            <div>
              <p className="erp-prod-stat-label">Low stock alerts</p>
              <p className="erp-prod-stat-value">{summary.lowStockCount}</p>
            </div>
          </div>
        </div>

        <div className="erp-fin-toolbar">
          <div className="erp-fin-search-wrap">
            <Search className="erp-fin-search-icon" />
            <input
              type="text"
              placeholder="Search item, SKU, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="erp-prod-register">
          <div className="erp-prod-register-head">
            <div>
              <p className="erp-prod-register-title">Inventory register</p>
              <p className="erp-prod-register-meta">{filtered.length} products{searchQuery ? ` · “${searchQuery}”` : ""}</p>
            </div>
            <RegisterExportToolbar
              onPrint={onPrint}
              onExportPdf={onExportPdf}
              pdfLoading={pdfLoading}
              disabled={filtered.length === 0}
              resultCount={filtered.length}
              label="report"
            />
          </div>

          <ProductsRegister
            rows={filtered}
            loading={loading}
            mode="inventory"
            onRowClick={(row) => router.push(`/products/${row.id}`)}
            footerLabel={`${filtered.length} items`}
            footerValue={formatCurrency(filteredTotal)}
          />
        </div>
      </div>

      <div className="erp-register-print-host" aria-hidden>
        <RegisterPrintView
          ref={printRef}
          title="Inventory Report"
          subtitle={`Total value ${formatCurrency(filteredTotal)} · ${summary.lowStockCount} low stock`}
          company={companySettings}
          columns={printColumns}
          rows={filtered}
          footers={[{
            label: "Total stock value",
            value: formatCurrency(filteredTotal),
            valueColumn: "value",
            labelColumn: "cost",
          }]}
        />
      </div>
    </div>
  );
}

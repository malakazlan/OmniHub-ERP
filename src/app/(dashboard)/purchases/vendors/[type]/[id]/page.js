"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/Button";
import PurchaseVendorItemsRegister, {
  PurchaseVendorBillsRegister,
} from "@/components/purchases/PurchaseVendorItemsRegister";
import {
  ShoppingCart, Loader2, ArrowLeft, Package, Hash, Layers, Sprout, Building2,
  List, Phone, MapPin, Search, Plus, Wallet, TrendingUp,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

const TransferRegisterExports = dynamic(
  () => import("@/components/accounts/TransferRegisterExports"),
  { ssr: false }
);

const ITEM_PRINT_COLS = [
  { key: "product", label: "Product", get: (r) => r.productName, pdfWidth: 36 },
  { key: "sku", label: "SKU", get: (r) => r.sku || "—", pdfWidth: 18 },
  { key: "times", label: "Times", get: (r) => String(r.purchaseCount), pdfWidth: 14 },
  { key: "qty", label: "Quantity", align: "right", get: (r) => String(r.totalQuantity), pdfWidth: 22 },
  { key: "unit", label: "Unit", get: (r) => r.unit, pdfWidth: 14 },
  { key: "avg", label: "Avg rate", align: "right", get: (r) => formatCurrency(r.avgRate), pdfWidth: 22 },
  { key: "total", label: "Total", align: "right", get: (r) => formatCurrency(r.totalAmount), pdfWidth: 26 },
];

export default function PurchaseVendorDetailPage() {
  const { type, id } = useParams();
  const { showToast } = useToast();
  const printRef = useRef(null);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("items");
  const [companySettings, setCompanySettings] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("qty");

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/purchases/vendors/${type}/${id}`);
      const json = await res.json();
      if (res.ok) setData(json);
      else showToast(json.error || "Failed to load vendor", "error");
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  }, [type, id, showToast]);

  useEffect(() => {
    if (type && id) fetchDetail();
  }, [type, id, fetchDetail]);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => { if (d.settings) setCompanySettings(d.settings); })
      .catch(() => {});
  }, []);

  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    const q = searchQuery.toLowerCase().trim();
    let rows = data.items;
    if (q) {
      rows = rows.filter(
        (r) =>
          r.productName?.toLowerCase().includes(q) ||
          r.sku?.toLowerCase().includes(q) ||
          r.unit?.toLowerCase().includes(q)
      );
    }
    const sorted = [...rows];
    if (sortBy === "qty") sorted.sort((a, b) => b.totalQuantity - a.totalQuantity);
    else if (sortBy === "value") sorted.sort((a, b) => b.totalAmount - a.totalAmount);
    else if (sortBy === "times") sorted.sort((a, b) => b.purchaseCount - a.purchaseCount);
    else if (sortBy === "name") sorted.sort((a, b) => a.productName.localeCompare(b.productName));
    return sorted;
  }, [data?.items, searchQuery, sortBy]);

  if (loading && !data) {
    return (
      <div className="erp-pv-surface page-enter pb-8 min-h-[420px] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600">Loading vendor profile...</p>
        </div>
      </div>
    );
  }

  if (!data?.vendor) {
    return (
      <div className="erp-pv-surface page-enter p-8 text-center">
        <p className="text-slate-600 mb-4">Vendor not found.</p>
        <Link href="/purchases/vendors">
          <Button variant="outline"><ArrowLeft className="w-4 h-4" /> Back</Button>
        </Link>
      </div>
    );
  }

  const { vendor, summary, items, purchases } = data;
  const isFarmer = vendor.type === "farmer";
  const profileHref = isFarmer ? `/farmers/${vendor.entityId}` : `/companies/${vendor.entityId}`;
  const avgQtyPerBill =
    summary.purchaseCount > 0
      ? Math.round(summary.totalQuantity / summary.purchaseCount)
      : 0;

  const exportRows = activeTab === "items" ? filteredItems : purchases;
  const exportCols =
    activeTab === "items"
      ? ITEM_PRINT_COLS
      : [
          { key: "no", label: "Bill #", get: (r) => r.purchaseNumber, pdfWidth: 28 },
          { key: "date", label: "Date", get: (r) => new Date(r.purchaseDate).toLocaleDateString(), pdfWidth: 22 },
          { key: "items", label: "Lines", get: (r) => String(r.itemCount), pdfWidth: 14 },
          { key: "total", label: "Total", align: "right", get: (r) => formatCurrency(r.totalAmount), pdfWidth: 26 },
        ];

  return (
    <div className="erp-pv-surface page-enter pb-8">
      <div className="erp-finance-page space-y-5">
        <nav className="erp-pv-breadcrumb">
          <Link href="/purchases/vendors">Purchase vendors</Link>
          <span>/</span>
          <span>{vendor.name}</span>
        </nav>

        <header className="erp-pv-page-header">
          <div className="erp-pv-header-main">
            <div className="erp-pv-avatar">
              {isFarmer ? <Sprout className="w-7 h-7" /> : <Building2 className="w-7 h-7" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="erp-pv-page-badge">
                <TrendingUp className="w-3.5 h-3.5" />
                {isFarmer ? "Farmer supplier" : "Company supplier"}
              </div>
              <h1 className="erp-pv-page-title">{vendor.name}</h1>
              <p className="erp-pv-page-desc">
                Complete purchase item history — how many times bought, total quantity, and value per product.
              </p>
              <div className="erp-pv-meta-chips">
                {vendor.city && (
                  <span className="erp-pv-chip">
                    <MapPin className="w-3.5 h-3.5" />
                    {vendor.city}
                  </span>
                )}
                {vendor.phone && (
                  <span className="erp-pv-chip">
                    <Phone className="w-3.5 h-3.5" />
                    {vendor.phone}
                  </span>
                )}
                <Link href={profileHref} className="erp-pv-chip is-link">Account profile →</Link>
              </div>
            </div>
          </div>
          <div className="erp-pv-header-actions">
            <Link href="/purchases/vendors">
              <Button variant="outline" className="erp-pv-btn-ghost">
                <ArrowLeft className="w-4 h-4" /> All vendors
              </Button>
            </Link>
            <Link href="/purchases/new">
              <Button className="erp-pv-btn-primary">
                <Plus className="w-4 h-4" /> New purchase
              </Button>
            </Link>
          </div>
        </header>

        <div className="erp-pv-flow-bar">
          <div className="erp-pv-flow-item">
            <div className="erp-pv-flow-icon is-bills"><Hash className="w-4 h-4" /></div>
            <div>
              <p className="erp-pv-flow-label">Purchase bills</p>
              <p className="erp-pv-flow-value">{summary.purchaseCount}</p>
            </div>
          </div>
          <div className="erp-pv-flow-arrow">→</div>
          <div className="erp-pv-flow-item">
            <div className="erp-pv-flow-icon is-lines"><Layers className="w-4 h-4" /></div>
            <div>
              <p className="erp-pv-flow-label">Item lines</p>
              <p className="erp-pv-flow-value">{summary.lineItemCount}</p>
            </div>
          </div>
          <div className="erp-pv-flow-arrow">→</div>
          <div className="erp-pv-flow-item">
            <div className="erp-pv-flow-icon is-qty"><Package className="w-4 h-4" /></div>
            <div>
              <p className="erp-pv-flow-label">Total quantity</p>
              <p className="erp-pv-flow-value tabular-nums">
                {summary.totalQuantity.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
          <div className="erp-pv-flow-arrow">=</div>
          <div className="erp-pv-flow-item">
            <div className="erp-pv-flow-icon is-value"><ShoppingCart className="w-4 h-4" /></div>
            <div>
              <p className="erp-pv-flow-label">Purchased value</p>
              <p className="erp-pv-flow-value">{formatCurrency(summary.totalAmount)}</p>
            </div>
          </div>
          {summary.balance !== undefined && summary.balance !== 0 && (
            <div className="erp-pv-flow-payable">
              <p className="erp-pv-flow-label flex items-center gap-1">
                <Wallet className="w-3 h-3" /> Ledger payable
              </p>
              <p className="text-xl font-black text-white tabular-nums">{formatCurrency(Math.abs(summary.balance))}</p>
            </div>
          )}
        </div>

        <div className="erp-pv-stats">
          <div className="erp-pv-stat">
            <div className="erp-pv-stat-icon is-bills"><Hash className="w-4 h-4" /></div>
            <div>
              <p className="erp-pv-stat-label">Purchase bills</p>
              <p className="erp-pv-stat-value">{summary.purchaseCount}</p>
              <p className="erp-pv-stat-sub">~{avgQtyPerBill} qty / bill</p>
            </div>
          </div>
          <div className="erp-pv-stat">
            <div className="erp-pv-stat-icon is-items"><Layers className="w-4 h-4" /></div>
            <div>
              <p className="erp-pv-stat-label">Item lines</p>
              <p className="erp-pv-stat-value">{summary.lineItemCount}</p>
            </div>
          </div>
          <div className="erp-pv-stat">
            <div className="erp-pv-stat-icon is-vendors"><Package className="w-4 h-4" /></div>
            <div>
              <p className="erp-pv-stat-label">Unique products</p>
              <p className="erp-pv-stat-value">{summary.uniqueProducts}</p>
            </div>
          </div>
          <div className="erp-pv-stat">
            <div className="erp-pv-stat-icon is-value"><ShoppingCart className="w-4 h-4" /></div>
            <div>
              <p className="erp-pv-stat-label">Total quantity</p>
              <p className="erp-pv-stat-value text-blue-800 tabular-nums">
                {summary.totalQuantity.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
              <p className="erp-pv-stat-sub">{formatCurrency(summary.totalAmount)}</p>
            </div>
          </div>
        </div>

        <div className="erp-pv-tabs">
          <button
            type="button"
            className={`erp-pv-tab ${activeTab === "items" ? "is-active" : ""}`}
            onClick={() => setActiveTab("items")}
          >
            <Package className="w-4 h-4" />
            Items purchased ({items.length})
          </button>
          <button
            type="button"
            className={`erp-pv-tab ${activeTab === "bills" ? "is-active" : ""}`}
            onClick={() => setActiveTab("bills")}
          >
            <List className="w-4 h-4" />
            Purchase bills ({purchases.length})
          </button>
        </div>

        <TransferRegisterExports
          printRef={printRef}
          title={`${vendor.name} — ${activeTab === "items" ? "Items purchased" : "Purchase bills"}`}
          subtitle={`${exportRows.length} records`}
          company={companySettings}
          columns={exportCols}
          rows={exportRows}
          footers={activeTab === "items" ? [{
            label: "Total quantity",
            value: String(summary.totalQuantity),
            valueColumn: "qty",
            labelColumn: "unit",
          }] : []}
          filename={`vendor-${vendor.name.replace(/\s+/g, "-").slice(0, 20)}-${activeTab}.pdf`}
          toolbarSlot={(toolbar) => (
            <div className="erp-pv-register erp-pv-register-detail">
              <div className="erp-pv-register-head">
                <div>
                  <p className="erp-pv-register-title">
                    {activeTab === "items" ? "Item purchase counts" : "Purchase bill history"}
                  </p>
                  <p className="erp-pv-register-meta">
                    {activeTab === "items"
                      ? `${filteredItems.length} product${filteredItems.length === 1 ? "" : "s"} · times bought & total quantity per item`
                      : `${purchases.length} confirmed bill${purchases.length === 1 ? "" : "s"} from this vendor`}
                  </p>
                </div>
                {toolbar}
              </div>
              {activeTab === "items" && (
                <div className="erp-pv-register-filters">
                  <div className="erp-pv-search-wrap">
                    <Search className="erp-pv-search-icon" />
                    <input
                      type="text"
                      placeholder="Search product name or SKU..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="erp-pv-select"
                    aria-label="Sort items"
                  >
                    <option value="qty">Sort: highest quantity</option>
                    <option value="value">Sort: highest value</option>
                    <option value="times">Sort: most purchased</option>
                    <option value="name">Sort: name A–Z</option>
                  </select>
                </div>
              )}
              {activeTab === "items" ? (
                <PurchaseVendorItemsRegister items={filteredItems} loading={loading} />
              ) : (
                <PurchaseVendorBillsRegister purchases={purchases} loading={loading} />
              )}
            </div>
          )}
        />
      </div>
    </div>
  );
}

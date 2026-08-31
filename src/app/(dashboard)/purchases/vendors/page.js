"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/Button";
import PurchaseVendorsRegister from "@/components/purchases/PurchaseVendorsRegister";
import {
  ShoppingCart, Loader2, Plus, Search, Users, Package, Hash,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

const TransferRegisterExports = dynamic(
  () => import("@/components/accounts/TransferRegisterExports"),
  { ssr: false }
);

const PRINT_COLS = [
  { key: "name", label: "Vendor", get: (r) => r.name, pdfWidth: 36 },
  { key: "type", label: "Type", get: (r) => r.type, pdfWidth: 18 },
  { key: "purchases", label: "Purchases", get: (r) => String(r.purchaseCount), pdfWidth: 16 },
  { key: "lines", label: "Item lines", get: (r) => String(r.lineItemCount), pdfWidth: 16 },
  { key: "qty", label: "Total qty", align: "right", get: (r) => String(r.totalQuantity), pdfWidth: 20 },
  { key: "products", label: "Products", get: (r) => String(r.uniqueProducts), pdfWidth: 16 },
  { key: "amount", label: "Value", align: "right", get: (r) => formatCurrency(r.totalAmount), pdfWidth: 28 },
];

export default function PurchaseVendorsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const printRef = useRef(null);

  const [vendors, setVendors] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companySettings, setCompanySettings] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [activityFilter, setActivityFilter] = useState("all");

  useEffect(() => {
    fetch("/api/purchases/vendors")
      .then((r) => r.json())
      .then((d) => {
        if (d.vendors) {
          setVendors(d.vendors);
          setSummary(d.summary);
        } else showToast(d.error || "Failed to load vendors", "error");
      })
      .catch(() => showToast("Error connecting to server", "error"))
      .finally(() => setLoading(false));

    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => { if (d.settings) setCompanySettings(d.settings); })
      .catch(() => {});
  }, [showToast]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return vendors.filter((v) => {
      if (typeFilter !== "all" && v.type !== typeFilter) return false;
      if (activityFilter === "active" && v.purchaseCount === 0) return false;
      if (activityFilter === "none" && v.purchaseCount > 0) return false;
      if (!q) return true;
      return (
        v.name?.toLowerCase().includes(q) ||
        v.city?.toLowerCase().includes(q) ||
        v.phone?.toLowerCase().includes(q)
      );
    });
  }, [vendors, searchQuery, typeFilter, activityFilter]);

  return (
    <div className="erp-pv-surface page-enter pb-8">
      <div className="erp-finance-page space-y-5">
        <header className="erp-pv-page-header">
          <div className="erp-pv-header-main">
            <div className="erp-pv-avatar">
              <ShoppingCart className="w-7 h-7" />
            </div>
            <div>
              <div className="erp-pv-page-badge">Purchase · Vendor accounts</div>
              <h1 className="erp-pv-page-title">Purchase vendors</h1>
              <p className="erp-pv-page-desc">
                All farmer and supplier accounts you buy from. Click a vendor to see every item purchased and quantity counts.
              </p>
            </div>
          </div>
          <div className="erp-pv-header-actions">
            <Link href="/purchases">
              <Button variant="outline" className="erp-pv-btn-ghost">All purchases</Button>
            </Link>
            <Link href="/purchases/new">
              <Button className="erp-pv-btn-primary">
                <Plus className="w-4 h-4" /> New purchase
              </Button>
            </Link>
          </div>
        </header>

        <div className="erp-pv-stats">
          <div className="erp-pv-stat">
            <div className="erp-pv-stat-icon is-vendors"><Users className="w-4 h-4" /></div>
            <div>
              <p className="erp-pv-stat-label">Vendor accounts</p>
              <p className="erp-pv-stat-value">{summary?.vendors ?? 0}</p>
            </div>
          </div>
          <div className="erp-pv-stat">
            <div className="erp-pv-stat-icon is-bills"><Hash className="w-4 h-4" /></div>
            <div>
              <p className="erp-pv-stat-label">Purchase bills</p>
              <p className="erp-pv-stat-value">{summary?.purchases ?? 0}</p>
            </div>
          </div>
          <div className="erp-pv-stat">
            <div className="erp-pv-stat-icon is-items"><Package className="w-4 h-4" /></div>
            <div>
              <p className="erp-pv-stat-label">Item lines</p>
              <p className="erp-pv-stat-value">{summary?.items ?? 0}</p>
            </div>
          </div>
          <div className="erp-pv-stat">
            <div className="erp-pv-stat-icon is-value"><ShoppingCart className="w-4 h-4" /></div>
            <div>
              <p className="erp-pv-stat-label">Total purchased</p>
              <p className="erp-pv-stat-value text-blue-800">{formatCurrency(summary?.amount ?? 0)}</p>
            </div>
          </div>
        </div>

        <TransferRegisterExports
          printRef={printRef}
          title="Purchase Vendors Register"
          subtitle={`${filtered.length} vendors · item purchase counts`}
          company={companySettings}
          columns={PRINT_COLS}
          rows={filtered}
          footers={[{
            label: "Total purchased value",
            value: formatCurrency(filtered.reduce((s, v) => s + (v.totalAmount || 0), 0)),
            valueColumn: "amount",
            labelColumn: "products",
          }]}
          filename={`purchase-vendors-${new Date().toISOString().slice(0, 10)}.pdf`}
          toolbarSlot={(toolbar) => (
            <div className="erp-pv-register">
              <div className="erp-pv-register-head">
                <div>
                  <p className="erp-pv-register-title">Vendor register</p>
                  <p className="erp-pv-register-meta">
                    {filtered.length} account{filtered.length === 1 ? "" : "s"} · click row for item breakdown
                  </p>
                </div>
                {toolbar}
              </div>
              <div className="erp-pv-register-filters">
                <div className="erp-pv-search-wrap">
                  <Search className="erp-pv-search-icon" />
                  <input
                    type="text"
                    placeholder="Search vendor, city, phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="erp-pv-select"
                  aria-label="Filter by type"
                >
                  <option value="all">All types</option>
                  <option value="farmer">Farmers</option>
                  <option value="company">Companies</option>
                </select>
                <select
                  value={activityFilter}
                  onChange={(e) => setActivityFilter(e.target.value)}
                  className="erp-pv-select"
                  aria-label="Filter by activity"
                >
                  <option value="all">All vendors</option>
                  <option value="active">With purchases</option>
                  <option value="none">No purchases yet</option>
                </select>
              </div>
              <PurchaseVendorsRegister
                vendors={filtered}
                loading={loading}
                onRowClick={(row) => {
                  if (row.type === "farmer" || row.type === "company") {
                    router.push(`/purchases/vendors/${row.type}/${row.entityId}`);
                  }
                }}
              />
            </div>
          )}
        />
      </div>
    </div>
  );
}

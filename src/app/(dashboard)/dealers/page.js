"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/Button";
import { Modal } from "@/components/ui/Modal";
import DealersRegister from "@/components/dealers/DealersRegister";
import DealerAnalyticsPanel from "@/components/dealers/DealerAnalyticsPanel";
import {
  Handshake, Loader2, Plus, Store, DollarSign, Users, Search, BarChart3,
  List, Filter, CalendarDays,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

const TransferRegisterExports = dynamic(
  () => import("@/components/accounts/TransferRegisterExports"),
  { ssr: false }
);

const emptyDealerForm = () => ({
  name: "",
  contactPerson: "",
  phone: "",
  whatsappNumber: "",
  city: "",
  address: "",
  notes: "",
});

const REGISTER_PRINT_COLS = [
  { key: "name", label: "Dealer", get: (r) => r.name, pdfWidth: 36 },
  { key: "city", label: "City", get: (r) => r.city || "—", pdfWidth: 24 },
  { key: "phone", label: "Phone", get: (r) => r.phone || "—", pdfWidth: 24 },
  { key: "shops", label: "Shops", get: (r) => `${r.activeShops}/${r.shopCount}`, pdfWidth: 18 },
  { key: "pending", label: "Pending", align: "right", get: (r) => formatCurrency(r.totalReceivable || 0), pdfWidth: 28 },
  { key: "status", label: "Status", get: (r) => (r.isActive ? "Active" : "Inactive"), pdfWidth: 18 },
];

const ANALYTICS_PRINT_COLS = [
  { key: "name", label: "Dealer", get: (r) => r.name, pdfWidth: 32 },
  { key: "shops", label: "Shops", get: (r) => String(r.shopCount || 0), pdfWidth: 14 },
  { key: "out", label: "Sales out", align: "right", get: (r) => formatCurrency(r.totalOut || 0), pdfWidth: 26 },
  { key: "in", label: "Collections in", align: "right", get: (r) => formatCurrency(r.totalIn || 0), pdfWidth: 26 },
  { key: "pending", label: "Pending", align: "right", get: (r) => formatCurrency(r.totalReceivable || 0), pdfWidth: 26 },
  { key: "rate", label: "Collection %", align: "right", get: (r) => `${r.collectionRate || 0}%`, pdfWidth: 20 },
];

export default function DealersPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const printRef = useRef(null);

  const [activeTab, setActiveTab] = useState("register");
  const [dealers, setDealers] = useState([]);
  const [totals, setTotals] = useState({ dealers: 0, shops: 0, receivable: 0 });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyDealerForm());
  const [companySettings, setCompanySettings] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("");
  const [pendingFilter, setPendingFilter] = useState("all");

  const [analyticsFrom, setAnalyticsFrom] = useState("");
  const [analyticsTo, setAnalyticsTo] = useState("");
  const [analyticsDealerId, setAnalyticsDealerId] = useState("");
  const [analyticsCity, setAnalyticsCity] = useState("");
  const [analyticsStatus, setAnalyticsStatus] = useState("all");
  const [analyticsSort, setAnalyticsSort] = useState("pending");
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const fetchDealers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dealers");
      const data = await res.json();
      if (res.ok) {
        setDealers(data.dealers || []);
        setTotals(data.totals || { dealers: 0, shops: 0, receivable: 0 });
      } else showToast(data.error || "Failed to load dealers", "error");
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const params = new URLSearchParams();
      if (analyticsFrom) params.set("from", analyticsFrom);
      if (analyticsTo) params.set("to", analyticsTo);
      if (analyticsDealerId) params.set("dealerId", analyticsDealerId);
      if (analyticsCity) params.set("city", analyticsCity);
      if (analyticsStatus !== "all") params.set("status", analyticsStatus);
      if (analyticsSort) params.set("sortBy", analyticsSort);

      const res = await fetch(`/api/dealers/analytics?${params.toString()}`);
      const data = await res.json();
      if (res.ok) setAnalytics(data);
      else showToast(data.error || "Failed to load analytics", "error");
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setAnalyticsLoading(false);
    }
  }, [analyticsFrom, analyticsTo, analyticsDealerId, analyticsCity, analyticsStatus, analyticsSort, showToast]);

  useEffect(() => {
    fetchDealers();
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => { if (d.settings) setCompanySettings(d.settings); })
      .catch(() => {});
  }, [fetchDealers]);

  useEffect(() => {
    if (activeTab === "analytics") fetchAnalytics();
  }, [activeTab, fetchAnalytics]);

  const cities = useMemo(() => {
    const set = new Set(dealers.map((d) => d.city).filter(Boolean));
    return Array.from(set).sort();
  }, [dealers]);

  const filteredDealers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return dealers.filter((row) => {
      if (statusFilter === "active" && !row.isActive) return false;
      if (statusFilter === "inactive" && row.isActive) return false;
      if (cityFilter && row.city !== cityFilter) return false;
      if (pendingFilter === "pending" && !(row.totalReceivable > 0)) return false;
      if (pendingFilter === "clear" && row.totalReceivable > 0) return false;
      if (!q) return true;
      return (
        row.name?.toLowerCase().includes(q) ||
        row.city?.toLowerCase().includes(q) ||
        row.phone?.toLowerCase().includes(q) ||
        row.contactPerson?.toLowerCase().includes(q)
      );
    });
  }, [dealers, searchQuery, statusFilter, cityFilter, pendingFilter]);

  const filteredPending = filteredDealers.reduce((s, d) => s + (d.totalReceivable || 0), 0);

  const analyticsPeriodLabel = analyticsFrom || analyticsTo
    ? `${analyticsFrom || "Start"} → ${analyticsTo || "Today"}`
    : "All time";

  const analyticsRows = analytics?.dealers || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast("Dealer name is required", "warning");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/dealers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Dealer registered", "success");
        setModalOpen(false);
        setForm(emptyDealerForm());
        fetchDealers();
      } else showToast(data.error || "Failed to create dealer", "error");
    } catch {
      showToast("Error processing request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const exportConfig =
    activeTab === "register"
      ? {
          title: "Dealers Register",
          subtitle: `${filteredDealers.length} dealers`,
          columns: REGISTER_PRINT_COLS,
          rows: filteredDealers,
          footers: [{
            label: "Total pending",
            value: formatCurrency(filteredPending),
            valueColumn: "pending",
            labelColumn: "shops",
          }],
          filename: `dealers-register-${new Date().toISOString().slice(0, 10)}.pdf`,
        }
      : {
          title: "Dealer Analytics Report",
          subtitle: `${analyticsPeriodLabel} · ${analyticsRows.length} dealers`,
          columns: ANALYTICS_PRINT_COLS,
          rows: analyticsRows,
          footers: [{
            label: "Total pending",
            value: formatCurrency(analytics?.summary?.totalReceivable || 0),
            valueColumn: "pending",
            labelColumn: "rate",
          }],
          filename: `dealer-analytics-${new Date().toISOString().slice(0, 10)}.pdf`,
        };

  return (
    <div className="erp-dealer-surface page-enter pb-8">
      <div className="erp-finance-page space-y-5">
        <header className="erp-dealer-page-header">
          <div className="erp-dealer-header-main">
            <div className="erp-dealer-avatar">
              <Handshake className="w-7 h-7" />
            </div>
            <div>
              <div className="erp-dealer-page-badge">
                <Store className="w-3.5 h-3.5" />
                Purchase & Sales · Dealer network
              </div>
              <h1 className="erp-dealer-page-title">Dealers</h1>
              <p className="erp-dealer-page-desc">
                Manage dealers, track shop-wise receivables, and run analytics on sales out vs collections in.
              </p>
            </div>
          </div>
          <div className="erp-dealer-header-actions">
            <Button onClick={() => setModalOpen(true)} className="erp-dealer-btn-primary">
              <Plus className="w-4 h-4" /> New dealer
            </Button>
          </div>
        </header>

        <div className="erp-dealer-stats">
          <div className="erp-dealer-stat">
            <div className="erp-dealer-stat-icon is-shops"><Users className="w-4 h-4" /></div>
            <div>
              <p className="erp-dealer-stat-label">Total dealers</p>
              <p className="erp-dealer-stat-value">{totals.dealers}</p>
            </div>
          </div>
          <div className="erp-dealer-stat">
            <div className="erp-dealer-stat-icon is-out"><Store className="w-4 h-4" /></div>
            <div>
              <p className="erp-dealer-stat-label">Assigned shops</p>
              <p className="erp-dealer-stat-value">{totals.shops}</p>
            </div>
          </div>
          <div className="erp-dealer-stat">
            <div className="erp-dealer-stat-icon is-pending"><DollarSign className="w-4 h-4" /></div>
            <div>
              <p className="erp-dealer-stat-label">Total pending</p>
              <p className="erp-dealer-stat-value text-red-600">{formatCurrency(totals.receivable)}</p>
            </div>
          </div>
          <div className="erp-dealer-stat">
            <div className="erp-dealer-stat-icon is-in"><Filter className="w-4 h-4" /></div>
            <div>
              <p className="erp-dealer-stat-label">In view</p>
              <p className="erp-dealer-stat-value text-violet-700">
                {activeTab === "register" ? filteredDealers.length : analyticsRows.length}
              </p>
              <p className="erp-dealer-stat-sub">{activeTab === "register" ? "filtered dealers" : "in report"}</p>
            </div>
          </div>
        </div>

        <div className="erp-dealer-tabs">
          <button
            type="button"
            className={`erp-dealer-tab ${activeTab === "register" ? "is-active" : ""}`}
            onClick={() => setActiveTab("register")}
          >
            <List className="w-4 h-4" />
            Dealer register
          </button>
          <button
            type="button"
            className={`erp-dealer-tab ${activeTab === "analytics" ? "is-active" : ""}`}
            onClick={() => setActiveTab("analytics")}
          >
            <BarChart3 className="w-4 h-4" />
            Analytics report
          </button>
        </div>

        {activeTab === "register" ? (
          <>
            <div className="erp-dealer-toolbar">
              <div className="erp-dealer-search-wrap">
                <Search className="erp-dealer-search-icon" />
                <input
                  type="text"
                  placeholder="Search dealer, city, phone, contact..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="erp-dealer-filter-row">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="erp-dealer-select"
                  aria-label="Status filter"
                >
                  <option value="all">All status</option>
                  <option value="active">Active only</option>
                  <option value="inactive">Inactive only</option>
                </select>
                <select
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className="erp-dealer-select"
                  aria-label="City filter"
                >
                  <option value="">All cities</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select
                  value={pendingFilter}
                  onChange={(e) => setPendingFilter(e.target.value)}
                  className="erp-dealer-select"
                  aria-label="Pending filter"
                >
                  <option value="all">All balances</option>
                  <option value="pending">Has pending</option>
                  <option value="clear">Zero pending</option>
                </select>
              </div>
            </div>

            <TransferRegisterExports
              printRef={printRef}
              title={exportConfig.title}
              subtitle={exportConfig.subtitle}
              company={companySettings}
              columns={exportConfig.columns}
              rows={exportConfig.rows}
              footers={exportConfig.footers}
              filename={exportConfig.filename}
              toolbarSlot={(toolbar) => (
                <div className="erp-dealer-register">
                  <div className="erp-dealer-register-head">
                    <div>
                      <p className="erp-dealer-register-title">Dealer register</p>
                      <p className="erp-dealer-register-meta">
                        {filteredDealers.length} dealer{filteredDealers.length === 1 ? "" : "s"} · click a row for shop-wise detail
                      </p>
                    </div>
                    {toolbar}
                  </div>
                  <DealersRegister
                    dealers={filteredDealers}
                    loading={loading}
                    onRowClick={(row) => router.push(`/dealers/${row.id}`)}
                  />
                </div>
              )}
            />
          </>
        ) : (
          <>
            <div className="erp-dealer-toolbar erp-dealer-analytics-filters">
              <div>
                <p className="erp-dealer-toolbar-title flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-violet-500" />
                  Analytics filters
                </p>
                <p className="erp-dealer-toolbar-desc">Sales out and collections in respect the date range. Pending uses current ledger balance.</p>
              </div>
              <div className="erp-dealer-analytics-filter-grid">
                <input
                  type="date"
                  value={analyticsFrom}
                  onChange={(e) => setAnalyticsFrom(e.target.value)}
                  className="erp-dealer-date-input"
                  aria-label="From date"
                />
                <span className="text-xs font-semibold text-slate-400 self-center">to</span>
                <input
                  type="date"
                  value={analyticsTo}
                  onChange={(e) => setAnalyticsTo(e.target.value)}
                  className="erp-dealer-date-input"
                  aria-label="To date"
                />
                <select
                  value={analyticsDealerId}
                  onChange={(e) => setAnalyticsDealerId(e.target.value)}
                  className="erp-dealer-select"
                  aria-label="Dealer filter"
                >
                  <option value="">All dealers</option>
                  {dealers.map((d) => (
                    <option key={d.id} value={String(d.id)}>{d.name}</option>
                  ))}
                </select>
                <select
                  value={analyticsCity}
                  onChange={(e) => setAnalyticsCity(e.target.value)}
                  className="erp-dealer-select"
                  aria-label="City filter"
                >
                  <option value="">All cities</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select
                  value={analyticsStatus}
                  onChange={(e) => setAnalyticsStatus(e.target.value)}
                  className="erp-dealer-select"
                  aria-label="Status filter"
                >
                  <option value="all">All status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <select
                  value={analyticsSort}
                  onChange={(e) => setAnalyticsSort(e.target.value)}
                  className="erp-dealer-select"
                  aria-label="Sort by"
                >
                  <option value="pending">Sort: pending</option>
                  <option value="out">Sort: sales out</option>
                  <option value="in">Sort: collections in</option>
                  <option value="shops">Sort: shop count</option>
                  <option value="name">Sort: name</option>
                </select>
                {(analyticsFrom || analyticsTo || analyticsDealerId || analyticsCity || analyticsStatus !== "all") && (
                  <button
                    type="button"
                    className="erp-dealer-clear-btn"
                    onClick={() => {
                      setAnalyticsFrom("");
                      setAnalyticsTo("");
                      setAnalyticsDealerId("");
                      setAnalyticsCity("");
                      setAnalyticsStatus("all");
                      setAnalyticsSort("pending");
                    }}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            <TransferRegisterExports
              printRef={printRef}
              title={exportConfig.title}
              subtitle={exportConfig.subtitle}
              company={companySettings}
              columns={exportConfig.columns}
              rows={exportConfig.rows}
              footers={exportConfig.footers}
              filename={exportConfig.filename}
              toolbarSlot={(toolbar) => (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-end gap-2 no-print">
                    {toolbar}
                  </div>
                  <DealerAnalyticsPanel
                    summary={analytics?.summary}
                    dealers={analyticsRows}
                    topShops={analytics?.topShops || []}
                    loading={analyticsLoading}
                    periodLabel={analyticsPeriodLabel}
                  />
                </div>
              )}
            />
          </>
        )}

        <p className="text-xs text-slate-500 text-center">
          Assign shops to a dealer in{" "}
          <Link href="/shops" className="text-violet-600 font-semibold hover:underline">Shops</Link>
          {" "}or{" "}
          <Link href="/accounts?category=shop&create=1" className="text-violet-600 font-semibold hover:underline">All Accounts</Link>.
        </p>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Register dealer" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="erp-finance-label">Dealer name *</label>
              <input
                required
                className="erp-finance-input w-full"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Ali Traders"
              />
            </div>
            <div>
              <label className="erp-finance-label">Contact person</label>
              <input className="erp-finance-input w-full" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
            </div>
            <div>
              <label className="erp-finance-label">City</label>
              <input className="erp-finance-input w-full" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <label className="erp-finance-label">Phone</label>
              <input className="erp-finance-input w-full" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="erp-finance-label">WhatsApp</label>
              <input className="erp-finance-input w-full" value={form.whatsappNumber} onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="erp-finance-label">Address</label>
              <textarea rows={2} className="erp-finance-input w-full resize-none" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="erp-finance-label">Notes</label>
              <textarea rows={2} className="erp-finance-input w-full resize-none" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting} className="erp-dealer-btn-primary">
              {submitting ? "Saving..." : "Save dealer"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/Button";
import DealerShopsRegister from "@/components/dealers/DealerShopsRegister";
import {
  Handshake, Loader2, ArrowLeft, ArrowDownLeft, ArrowUpRight, Store,
  DollarSign, CalendarDays, Phone, MapPin, User, AlertTriangle, TrendingUp,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

export default function DealerDetailPage() {
  const { id } = useParams();
  const { showToast } = useToast();
  const [dealer, setDealer] = useState(null);
  const [summary, setSummary] = useState(null);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const fetchDealer = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      const res = await fetch(`/api/dealers/${id}?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setDealer(data.dealer);
        setSummary(data.summary);
        setShops(data.shops || []);
      } else showToast(data.error || "Failed to load dealer", "error");
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  }, [id, fromDate, toDate, showToast]);

  useEffect(() => {
    if (id) fetchDealer();
  }, [id, fetchDealer]);

  if (loading && !dealer) {
    return (
      <div className="erp-dealer-surface page-enter pb-8 min-h-[420px] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-violet-600 animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600">Loading dealer profile...</p>
        </div>
      </div>
    );
  }

  if (!dealer) {
    return (
      <div className="erp-dealer-surface page-enter pb-8">
        <div className="erp-finance-page py-16 text-center">
          <p className="text-slate-600 mb-4">Dealer not found.</p>
          <Link href="/dealers">
            <Button variant="outline"><ArrowLeft className="w-4 h-4" /> Back to dealers</Button>
          </Link>
        </div>
      </div>
    );
  }

  const periodLabel = fromDate || toDate
    ? `${fromDate || "Start"} → ${toDate || "Today"}`
    : "All time";

  const collectionRate = summary?.totalOut > 0
    ? Math.round((summary.totalIn / summary.totalOut) * 100)
    : 0;

  return (
    <div className="erp-dealer-surface page-enter pb-8">
      <div className="erp-finance-page space-y-5">
        <nav className="erp-dealer-breadcrumb">
          <Link href="/dealers">Dealers</Link>
          <span>/</span>
          <span>{dealer.name}</span>
        </nav>

        <header className="erp-dealer-page-header">
          <div className="erp-dealer-header-main">
            <div className="erp-dealer-avatar">
              <Handshake className="w-7 h-7" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="erp-dealer-page-badge">
                <TrendingUp className="w-3.5 h-3.5" />
                Dealer account · {periodLabel}
              </div>
              <h1 className="erp-dealer-page-title">{dealer.name}</h1>
              <p className="erp-dealer-page-desc">
                Combined sales out, collections in, and pending receivable from{" "}
                <strong>{summary?.shopCount || 0}</strong> assigned shop{(summary?.shopCount || 0) === 1 ? "" : "s"}.
              </p>
              <div className="erp-dealer-meta-chips">
                <span className="erp-dealer-chip">
                  <User className="w-3.5 h-3.5" />
                  {dealer.contactPerson || "No contact"}
                </span>
                <span className="erp-dealer-chip">
                  <Phone className="w-3.5 h-3.5" />
                  {dealer.phone || "—"}
                </span>
                <span className="erp-dealer-chip">
                  <MapPin className="w-3.5 h-3.5" />
                  {dealer.city || "—"}
                </span>
                <span className={`erp-dealer-chip ${dealer.isActive ? "is-active" : "is-inactive"}`}>
                  {dealer.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
          <div className="erp-dealer-header-actions">
            <Link href="/dealers">
              <Button variant="outline" className="erp-dealer-btn-ghost">
                <ArrowLeft className="w-4 h-4" /> All dealers
              </Button>
            </Link>
          </div>
        </header>

        <div className="erp-dealer-flow-bar">
          <div className="erp-dealer-flow-item is-out">
            <div className="erp-dealer-flow-icon"><ArrowUpRight className="w-4 h-4" /></div>
            <div>
              <p className="erp-dealer-flow-label">Sales out</p>
              <p className="erp-dealer-flow-value">{formatCurrency(summary?.totalOut || 0)}</p>
            </div>
          </div>
          <div className="erp-dealer-flow-arrow" aria-hidden>→</div>
          <div className="erp-dealer-flow-item is-in">
            <div className="erp-dealer-flow-icon"><ArrowDownLeft className="w-4 h-4" /></div>
            <div>
              <p className="erp-dealer-flow-label">Collections in</p>
              <p className="erp-dealer-flow-value">{formatCurrency(summary?.totalIn || 0)}</p>
            </div>
          </div>
          <div className="erp-dealer-flow-arrow" aria-hidden>=</div>
          <div className="erp-dealer-flow-item is-pending">
            <div className="erp-dealer-flow-icon"><DollarSign className="w-4 h-4" /></div>
            <div>
              <p className="erp-dealer-flow-label">Still pending</p>
              <p className="erp-dealer-flow-value">{formatCurrency(summary?.totalReceivable || 0)}</p>
            </div>
          </div>
          {summary?.totalOut > 0 && (
            <div className="erp-dealer-collection-rate">
              <p className="text-[10px] font-bold uppercase tracking-wider text-violet-200">Collection rate</p>
              <p className="text-2xl font-black text-white tabular-nums">{collectionRate}%</p>
            </div>
          )}
        </div>

        <div className="erp-dealer-stats">
          <div className="erp-dealer-stat">
            <div className="erp-dealer-stat-icon is-shops"><Store className="w-4 h-4" /></div>
            <div>
              <p className="erp-dealer-stat-label">Assigned shops</p>
              <p className="erp-dealer-stat-value">{summary?.shopCount || 0}</p>
              <p className="erp-dealer-stat-sub">{summary?.activeShops || 0} active</p>
            </div>
          </div>
          <div className="erp-dealer-stat">
            <div className="erp-dealer-stat-icon is-out"><ArrowUpRight className="w-4 h-4" /></div>
            <div>
              <p className="erp-dealer-stat-label">Sales out</p>
              <p className="erp-dealer-stat-value text-orange-700">{formatCurrency(summary?.totalOut || 0)}</p>
            </div>
          </div>
          <div className="erp-dealer-stat">
            <div className="erp-dealer-stat-icon is-in"><ArrowDownLeft className="w-4 h-4" /></div>
            <div>
              <p className="erp-dealer-stat-label">Collections in</p>
              <p className="erp-dealer-stat-value text-emerald-700">{formatCurrency(summary?.totalIn || 0)}</p>
            </div>
          </div>
          <div className="erp-dealer-stat">
            <div className="erp-dealer-stat-icon is-pending"><DollarSign className="w-4 h-4" /></div>
            <div>
              <p className="erp-dealer-stat-label">Total pending</p>
              <p className="erp-dealer-stat-value text-red-600">{formatCurrency(summary?.totalReceivable || 0)}</p>
            </div>
          </div>
        </div>

        <div className="erp-dealer-toolbar">
          <div>
            <p className="erp-dealer-toolbar-title">Shop-wise breakdown</p>
            <p className="erp-dealer-toolbar-desc">Filter sales out and collections in by date. Pending always reflects current balance.</p>
          </div>
          <div className="erp-dealer-date-row">
            <CalendarDays className="w-4 h-4 text-violet-400 shrink-0 hidden sm:block" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="erp-dealer-date-input"
              aria-label="From date"
            />
            <span className="text-xs font-semibold text-slate-400">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="erp-dealer-date-input"
              aria-label="To date"
            />
            {(fromDate || toDate) && (
              <button
                type="button"
                className="erp-dealer-clear-btn"
                onClick={() => { setFromDate(""); setToDate(""); }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="erp-dealer-register">
          <div className="erp-dealer-register-head">
            <div>
              <p className="erp-dealer-register-title">Shops under this dealer</p>
              <p className="erp-dealer-register-meta">
                {shops.length} shop{shops.length === 1 ? "" : "s"} · ledger debits = sales · credits = collections
              </p>
            </div>
            {loading && <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />}
          </div>
          <DealerShopsRegister shops={shops} loading={loading} summary={summary} />
        </div>

        {summary && summary.invoicePending > 0 && (
          <div className="erp-dealer-alert">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
            <p>
              Open invoice pending across shops:{" "}
              <strong>{formatCurrency(summary.invoicePending)}</strong>
              <span className="text-amber-700/80"> — sum of unpaid or partial sale invoices.</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/Button";
import OwnerWithdrawalForm, { emptyWithdrawalForm } from "@/components/admin/OwnerWithdrawalForm";
import OwnerWithdrawalsRegister from "@/components/admin/OwnerWithdrawalsRegister";
import {
  Banknote, Loader2, ArrowLeft, Plus, DollarSign, Hash, Search, Shield,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

export default function OwnerWithdrawalsPage() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [withdrawals, setWithdrawals] = useState([]);
  const [summary, setSummary] = useState({ count: 0, total: 0 });
  const [sourceAccounts, setSourceAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyWithdrawalForm());
  const [searchQuery, setSearchQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const isAdmin = user?.role === "admin";

  const fetchWithdrawals = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/admin/withdrawals?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setWithdrawals(data.withdrawals || []);
        setSummary(data.summary || { count: 0, total: 0 });
      } else showToast(data.error || "Failed to load withdrawals", "error");
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  }, [from, to, showToast]);

  useEffect(() => {
    if (!authLoading && isAdmin) {
      fetchWithdrawals();
      fetch("/api/accounts")
        .then((r) => r.json())
        .then((d) => {
          if (d.accounts) {
            setSourceAccounts(
              d.accounts.filter((a) => a.isActive && (a.category === "cash" || a.category === "bank"))
            );
          }
        })
        .catch(() => {});
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, isAdmin, fetchWithdrawals]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return withdrawals;
    return withdrawals.filter(
      (w) =>
        w.withdrawalNumber?.toLowerCase().includes(q) ||
        w.sourceAccount?.name?.toLowerCase().includes(q) ||
        w.notes?.toLowerCase().includes(q)
    );
  }, [withdrawals, searchQuery]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Withdrawal recorded", "success");
        setModalOpen(false);
        setForm(emptyWithdrawalForm());
        fetchWithdrawals();
        fetch("/api/accounts")
          .then((r) => r.json())
          .then((d) => {
            if (d.accounts) {
              setSourceAccounts(
                d.accounts.filter((a) => a.isActive && (a.category === "cash" || a.category === "bank"))
              );
            }
          })
          .catch(() => {});
      } else showToast(data.error || "Failed to record withdrawal", "error");
    } catch {
      showToast("Error processing request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!authLoading && !isAdmin) {
    return (
      <div className="erp-settings-surface page-enter p-10 text-center">
        <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-600 font-semibold">Admin access required</p>
        <Link href="/dashboard" className="text-sm text-slate-500 underline mt-2 inline-block">Back to dashboard</Link>
      </div>
    );
  }

  return (
    <div className="erp-settings-surface page-enter pb-8">
      <div className="erp-settings-page space-y-5">
        <header className="erp-settings-page-header">
          <div>
            <div className="erp-settings-page-badge">
              <Banknote className="w-3.5 h-3.5" />
              Administration
            </div>
            <h1 className="erp-settings-page-title">Owner draws</h1>
            <p className="erp-settings-page-desc">
              Record owner draws from company cash or bank. General ledger shows only &quot;Owner draw&quot;.
            </p>
          </div>
          <div className="erp-settings-header-actions">
            <Button onClick={() => { setForm(emptyWithdrawalForm()); setModalOpen(true); }} className="bg-slate-800 border-0">
              <Plus className="w-4 h-4" /> New draw
            </Button>
            <Link href="/dashboard">
              <Button variant="outline" className="border-slate-200 text-slate-600">
                <ArrowLeft className="w-4 h-4" /> Dashboard
              </Button>
            </Link>
          </div>
        </header>

        <div className="erp-settings-filter-bar">
          <div className="erp-settings-filter-field">
            <label>From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="erp-finance-input" />
          </div>
          <div className="erp-settings-filter-field">
            <label>To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="erp-finance-input" />
          </div>
          <Button onClick={fetchWithdrawals} className="bg-slate-800 border-0 self-end">Apply</Button>
        </div>

        <div className="erp-settings-stats">
          <div className="erp-settings-stat">
            <div className="erp-settings-stat-icon"><Hash className="w-4 h-4" /></div>
            <div>
              <p className="erp-settings-stat-label">Withdrawals</p>
              <p className="erp-settings-stat-value">{summary.count}</p>
            </div>
          </div>
          <div className="erp-settings-stat">
            <div className="erp-settings-stat-icon"><DollarSign className="w-4 h-4" /></div>
            <div>
              <p className="erp-settings-stat-label">Total withdrawn</p>
              <p className="erp-settings-stat-value text-red-700">{formatCurrency(summary.total)}</p>
            </div>
          </div>
        </div>

        <div className="erp-settings-toolbar">
          <div className="erp-settings-search-wrap">
            <Search className="erp-settings-search-icon" />
            <input
              type="text"
              placeholder="Search withdrawal #, account, note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="erp-settings-register">
          <div className="erp-settings-register-head">
            <div>
              <p className="erp-settings-register-title">Withdrawal register</p>
              <p className="erp-settings-register-meta">{filtered.length} record{filtered.length === 1 ? "" : "s"} · private notes visible here only</p>
            </div>
          </div>
          <OwnerWithdrawalsRegister rows={filtered} loading={loading} />
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Record owner draw" size="md">
        <OwnerWithdrawalForm
          form={form}
          onChange={setForm}
          sourceAccounts={sourceAccounts}
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  );
}

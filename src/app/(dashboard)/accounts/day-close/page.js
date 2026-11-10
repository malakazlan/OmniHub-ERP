"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { PageHeader, StatCard } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/Button";
import { CalendarCheck, Loader2, ArrowLeft, Lock, Wallet } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

function DetailRow({ label, value, mono = true, valueClassName = "" }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-xs font-bold text-slate-900 ${mono ? "font-mono" : ""} ${valueClassName}`}>{value}</span>
    </div>
  );
}

export default function DayClosePage() {
  const { showToast } = useToast();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState(null);
  const [existing, setExisting] = useState(null);
  const [closingCash, setClosingCash] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState([]);

  const fetchSummary = async (d) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/day-close?date=${d}`);
      const data = await res.json();
      if (res.ok) {
        setSummary(data.summary);
        setExisting(data.existing);
        setClosingCash(data.existing ? String(data.existing.closingCash) : String(data.summary?.computedClosingCash?.toFixed(2) || ""));
        setNotes(data.existing?.notes || "");
      } else {
        showToast(data.error || "Failed to load day summary", "error");
      }
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/day-close");
      const data = await res.json();
      if (res.ok) setHistory(data.closes || []);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    fetchSummary(date);
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const handleClose = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/day-close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closeDate: date, closingCash, notes }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Day ${formatDate(date)} closed successfully!`, "success");
        fetchSummary(date);
        fetchHistory();
      } else showToast(data.error || "Failed to close day", "error");
    } catch {
      showToast("Error processing request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const difference = summary ? (parseFloat(closingCash) || 0) - summary.computedClosingCash : 0;

  return (
    <div className="space-y-8 page-enter">
      <PageHeader
        module="accounts"
        title="Daily Close"
        description="Reconcile daily cash position and close the books for the day."
        icon={CalendarCheck}
        breadcrumbs={[
          { label: "Accounting", href: "/accounts" },
          { label: "Daily Close" },
        ]}
        actions={
          <Link href="/accounts">
            <Button variant="outline" className="border-slate-200 text-slate-600">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
        }
      />

      <div className="flex items-center gap-3">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Select Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input-field max-w-[200px]"
        />
        {existing && (
          <Badge variant="success">
            <Lock className="w-3 h-3" /> Closed by {existing.closedBy}
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-acc-accounts animate-spin" />
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard module="accounts" label="Total Sales" value={formatCurrency(summary.totalSales)} icon={Wallet} />
              <StatCard module="accounts" label="Total Purchases" value={formatCurrency(summary.totalPurchases)} icon={Wallet} />
              <StatCard module="accounts" label="Total Expenses" value={formatCurrency(summary.totalExpenses)} icon={Wallet} valueClassName="text-red-500" />
            </div>

            <Card>
              <CardHeader>
                <h2 className="text-sm font-bold text-slate-900">Cash Reconciliation</h2>
              </CardHeader>
              <CardContent>
                <DetailRow label="Opening Cash" value={formatCurrency(summary.openingCash)} />
                <DetailRow label="Cash Received (all sources)" value={formatCurrency(summary.cashReceived)} valueClassName="text-emerald-600" />
                <DetailRow label="Cash Paid Out (all sources)" value={formatCurrency(summary.cashOut)} valueClassName="text-red-500" />
                <DetailRow label="System Computed Closing Cash" value={formatCurrency(summary.computedClosingCash)} />
                <div className="pt-3 mt-2 border-t border-slate-200 space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Actual Cash Counted</label>
                  <input
                    type="number"
                    step="any"
                    value={closingCash}
                    onChange={(e) => setClosingCash(e.target.value)}
                    disabled={!!existing}
                    className="input-field disabled:opacity-60"
                  />
                </div>
                <div className="flex justify-between items-center pt-3">
                  <span className="text-xs font-semibold text-slate-500">Difference</span>
                  <span className={`font-mono font-bold ${Math.abs(difference) < 0.01 ? "text-emerald-600" : "text-red-500"}`}>
                    {formatCurrency(difference)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-sm font-bold text-slate-900">Other Receipts</h2>
              </CardHeader>
              <CardContent>
                <DetailRow label="Bank Received" value={formatCurrency(summary.bankReceived)} />
                <DetailRow label="Cheque Received" value={formatCurrency(summary.chequeReceived)} />
                <DetailRow label="Total Received" value={formatCurrency(summary.totalReceived)} />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h2 className="text-sm font-bold text-slate-900">
                  {existing ? "Day Closed" : "Close the Day"}
                </h2>
              </CardHeader>
              <CardContent>
                {existing ? (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500">
                      This day was already closed on {formatDate(existing.updatedAt)} by {existing.closedBy}.
                    </p>
                    {existing.notes && <p className="text-xs text-slate-600 italic">"{existing.notes}"</p>}
                  </div>
                ) : (
                  <form onSubmit={handleClose} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Notes</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="input-field h-20 resize-none"
                        placeholder="Optional closing remarks..."
                      />
                    </div>
                    <Button type="submit" disabled={submitting} className="bg-acc-accounts hover:bg-indigo-700 border-0 w-full">
                      {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                      Close Day
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-sm font-bold text-slate-900">Recent Closes</h2>
              </CardHeader>
              <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                {history.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No closed days yet.</p>
                ) : (
                  history.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => setDate(new Date(h.closeDate).toISOString().slice(0, 10))}
                      className="w-full flex items-center justify-between text-xs py-1.5 px-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <span className="text-slate-700">{formatDate(h.closeDate)}</span>
                      <span className={`font-mono font-semibold ${Math.abs(h.difference) < 0.01 ? "text-emerald-600" : "text-red-500"}`}>
                        {formatCurrency(h.closingCash)}
                      </span>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}

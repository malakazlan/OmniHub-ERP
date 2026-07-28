"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { PageHeader, StatCard } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/Button";
import { BookText, Plus, Loader2, ArrowLeft, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

const emptyLine = () => ({ accountId: "", description: "", debit: "", credit: "" });

export default function JournalPage() {
  const { showToast } = useToast();
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState([emptyLine(), emptyLine()]);

  const fetchEntries = async () => {
    try {
      const res = await fetch("/api/journal");
      const data = await res.json();
      if (res.ok) setEntries(data.entries || []);
      else showToast(data.error || "Failed to load journal entries", "error");
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/accounts");
        const data = await res.json();
        if (res.ok) setAccounts(data.accounts || []);
      } catch {
        /* ignore */
      }
    };
    load();
    fetchEntries();
  }, []);

  const openCreate = () => {
    setEntryDate(new Date().toISOString().slice(0, 10));
    setDescription("");
    setNotes("");
    setLines([emptyLine(), emptyLine()]);
    setModalOpen(true);
  };

  const updateLine = (idx, field, value) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description) {
      showToast("Description is required", "warning");
      return;
    }
    if (!isBalanced) {
      showToast("Debit and credit totals must be equal and greater than zero", "warning");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryDate, description, notes, lines }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Journal entry ${data.journal?.entryNumber || ""} posted!`, "success");
        setModalOpen(false);
        fetchEntries();
      } else showToast(data.error || "Failed to post journal entry", "error");
    } catch {
      showToast("Error processing request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const grandTotal = entries.reduce((s, e) => s + (e.totalDebit || 0), 0);

  return (
    <div className="space-y-8 page-enter">
      <PageHeader
        module="accounts"
        title="Journal Entries"
        description="Manual double-entry postings for adjustments and corrections."
        icon={BookText}
        breadcrumbs={[
          { label: "Accounting", href: "/accounts" },
          { label: "Journal" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/accounts">
              <Button variant="outline" className="border-slate-200 text-slate-600">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            </Link>
            <Button onClick={openCreate} className="bg-acc-accounts hover:bg-indigo-700 border-0">
              <Plus className="w-4 h-4" /> New Entry
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard module="accounts" label="Total Entries" value={entries.length} icon={BookText} />
        <StatCard module="accounts" label="Total Posted Value" value={formatCurrency(grandTotal)} icon={BookText} />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-acc-accounts animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">No journal entries recorded yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {entries.map((entry) => (
                <div key={entry.id}>
                  <button
                    type="button"
                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                    className="w-full flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {expandedId === entry.id ? (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{entry.description}</p>
                        <p className="text-[10px] font-mono text-slate-400">{entry.entryNumber} · {formatDate(entry.entryDate)}</p>
                      </div>
                    </div>
                    <span className="font-mono text-sm font-bold text-acc-accounts shrink-0">
                      {formatCurrency(entry.totalDebit)}
                    </span>
                  </button>
                  {expandedId === entry.id && (
                    <div className="px-5 pb-4">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                            <th className="py-2">Account</th>
                            <th className="py-2">Description</th>
                            <th className="py-2 text-right">Debit</th>
                            <th className="py-2 text-right">Credit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {entry.lines.map((line) => (
                            <tr key={line.id} className="text-xs">
                              <td className="py-2 font-semibold text-slate-800">{line.account?.name}</td>
                              <td className="py-2 text-slate-500">{line.description || "—"}</td>
                              <td className="py-2 text-right font-mono text-slate-700">
                                {line.debit > 0 ? formatCurrency(line.debit) : "—"}
                              </td>
                              <td className="py-2 text-right font-mono text-slate-700">
                                {line.credit > 0 ? formatCurrency(line.credit) : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="New Journal Entry" size="xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Date</label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="input-field"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Description *</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="input-field"
                placeholder="e.g. Depreciation adjustment for July"
              />
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-3 py-2">Account</th>
                  <th className="px-3 py-2">Line Description</th>
                  <th className="px-3 py-2 w-28">Debit</th>
                  <th className="px-3 py-2 w-28">Credit</th>
                  <th className="px-3 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((line, idx) => (
                  <tr key={idx} className="text-xs">
                    <td className="px-3 py-2">
                      <select
                        value={line.accountId}
                        onChange={(e) => updateLine(idx, "accountId", e.target.value)}
                        className="input-field py-1.5 px-2 text-xs"
                      >
                        <option value="">Select account</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => updateLine(idx, "description", e.target.value)}
                        className="input-field py-1.5 px-2 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={line.debit}
                        onChange={(e) => updateLine(idx, "debit", e.target.value)}
                        className="input-field py-1.5 px-2 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={line.credit}
                        onChange={(e) => updateLine(idx, "credit", e.target.value)}
                        className="input-field py-1.5 px-2 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2">
                      {lines.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          className="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="text-xs bg-slate-50 border-t border-slate-200">
                  <td className="px-3 py-2 font-semibold text-slate-600" colSpan={2}>
                    <button type="button" onClick={addLine} className="text-acc-accounts font-semibold hover:underline cursor-pointer">
                      + Add Line
                    </button>
                  </td>
                  <td className="px-3 py-2 font-mono font-bold text-slate-900">{formatCurrency(totalDebit)}</td>
                  <td className="px-3 py-2 font-mono font-bold text-slate-900">{formatCurrency(totalCredit)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {!isBalanced && (
            <p className="text-xs text-amber-600 font-semibold">
              ⚠ Debit and credit totals must match before posting.
            </p>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field h-16 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 border border-slate-200 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <Button type="submit" disabled={submitting || !isBalanced} className="bg-acc-accounts hover:bg-indigo-700 border-0">
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Post Entry
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

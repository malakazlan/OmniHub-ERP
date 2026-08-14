"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/Button";
import JournalEntryForm from "@/components/accounts/JournalEntryForm";
import JournalRegister from "@/components/accounts/JournalRegister";
import RegisterPrintView from "@/components/reports/RegisterPrintView";
import RegisterExportToolbar from "@/components/reports/RegisterExportToolbar";
import { useRegisterExport } from "@/hooks/useRegisterExport";
import { BookText, Plus, Loader2, ArrowLeft, Search } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { useDefaultCashAccountId } from "@/hooks/useDefaultCashAccount";

const JOURNAL_PRINT_COLS = [
  { key: "no", label: "Entry #", get: (r) => r.entryNumber, pdfWidth: 30 },
  { key: "date", label: "Date", get: (r) => formatDate(r.entryDate), pdfWidth: 28 },
  { key: "desc", label: "Description", get: (r) => r.description, pdfWidth: 90 },
  { key: "amt", label: "Amount", align: "right", get: (r) => formatCurrency(r.totalDebit), pdfWidth: 30 },
];

export default function JournalPage() {
  const { showToast } = useToast();
  const defaultCashAccountId = useDefaultCashAccountId();
  const printRef = useRef(null);
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [companySettings, setCompanySettings] = useState(null);

  const cashAccounts = useMemo(
    () => accounts.filter((a) => a.category === "cash"),
    [accounts]
  );
  const bankAccounts = useMemo(
    () => accounts.filter((a) => a.category === "bank"),
    [accounts]
  );

  const fetchEntries = useCallback(async () => {
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
  }, [showToast]);

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
    fetch("/api/settings").then((r) => r.json()).then((d) => { if (d.settings) setCompanySettings(d.settings); }).catch(() => {});
  }, [fetchEntries]);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.description?.toLowerCase().includes(q) ||
        e.entryNumber?.toLowerCase().includes(q) ||
        e.lines?.some((l) => l.account?.name?.toLowerCase().includes(q))
    );
  }, [entries, searchQuery]);

  const grandTotal = entries.reduce((s, e) => s + (e.totalDebit || 0), 0);
  const filteredTotal = filteredEntries.reduce((s, e) => s + (e.totalDebit || 0), 0);

  const { pdfLoading, onPrint, onExportPdf } = useRegisterExport({
    printRef,
    title: "Journal Register",
    subtitle: `${filteredEntries.length} entries`,
    company: companySettings,
    columns: JOURNAL_PRINT_COLS,
    rows: filteredEntries,
    footers: [{
      label: "Total posted",
      value: formatCurrency(filteredTotal),
      valueColumn: "amt",
      labelColumn: "desc",
    }],
    filename: `journal-${new Date().toISOString().slice(0, 10)}.pdf`,
  });

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  if (loading && entries.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center erp-finance-surface">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="erp-finance-surface page-enter pb-8">
      <div className="erp-finance-page space-y-5">
        <header className="erp-fin-page-header">
          <div>
            <div className="erp-fin-page-badge">
              <BookText className="w-3.5 h-3.5" />
              Finance · Journal
            </div>
            <h1 className="erp-fin-page-title">Journal entries</h1>
            <p className="erp-fin-page-desc">
              Manual double-entry postings and payment-split settlements for adjustments and corrections.
            </p>
          </div>
          <div className="erp-fin-header-actions">
            <Link href="/accounts">
              <Button variant="outline" className="border-slate-200 text-slate-600">
                <ArrowLeft className="w-4 h-4" /> Accounts
              </Button>
            </Link>
            <Button onClick={() => setModalOpen(true)} className="bg-acc-accounts border-0">
              <Plus className="w-4 h-4" /> New entry
            </Button>
          </div>
        </header>

        <div className="erp-fin-stats">
          <div className="erp-fin-stat">
            <div className="erp-fin-stat-icon"><BookText className="w-4 h-4" /></div>
            <div>
              <p className="erp-fin-stat-label">Total entries</p>
              <p className="erp-fin-stat-value">{entries.length}</p>
            </div>
          </div>
          <div className="erp-fin-stat">
            <div className="erp-fin-stat-icon"><BookText className="w-4 h-4" /></div>
            <div>
              <p className="erp-fin-stat-label">Posted value</p>
              <p className="erp-fin-stat-value">{formatCurrency(grandTotal)}</p>
            </div>
          </div>
        </div>

        <div className="erp-fin-toolbar">
          <div className="erp-fin-search-wrap">
            <Search className="erp-fin-search-icon" />
            <input
              type="text"
              placeholder="Search description, entry #, account..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="erp-fin-register">
          <div className="erp-fin-register-head">
            <div>
              <p className="erp-fin-register-title">Journal register</p>
              <p className="erp-fin-register-meta">
                {filteredEntries.length} entr{filteredEntries.length === 1 ? "y" : "ies"} · expand to view lines
              </p>
            </div>
            <RegisterExportToolbar
              onPrint={onPrint}
              onExportPdf={onExportPdf}
              pdfLoading={pdfLoading}
              disabled={filteredEntries.length === 0}
              resultCount={filteredEntries.length}
            />
          </div>

          <JournalRegister entries={filteredEntries} loading={loading} />
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Post journal entry" size="xl">
        {modalOpen && (
          <JournalEntryForm
            accounts={accounts}
            cashAccounts={cashAccounts}
            bankAccounts={bankAccounts}
            defaultCashAccountId={defaultCashAccountId}
            submitting={submitting}
            onSubmit={handleSubmit}
            onCancel={() => setModalOpen(false)}
          />
        )}
      </Modal>

      <div className="erp-register-print-host" aria-hidden>
        <RegisterPrintView
          ref={printRef}
          title="Journal Register"
          company={companySettings}
          columns={JOURNAL_PRINT_COLS}
          rows={filteredEntries}
          footers={[{
            label: "Total posted",
            value: formatCurrency(filteredTotal),
            valueColumn: "amt",
            labelColumn: "desc",
          }]}
        />
      </div>
    </div>
  );
}

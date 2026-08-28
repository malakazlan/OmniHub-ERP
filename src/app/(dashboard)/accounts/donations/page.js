"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/Button";
import DonationsRegister from "@/components/accounts/DonationsRegister";
import { emptyDonationForm } from "@/components/accounts/DonationForm";
import {
  Heart, Plus, Loader2, ArrowLeft, Search, Wallet, HandHeart, CalendarDays, Hash,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { useDefaultCashAccountId } from "@/hooks/useDefaultCashAccount";

const DonationForm = dynamic(
  () => import("@/components/accounts/DonationForm"),
  {
    ssr: false,
    loading: () => (
      <div className="py-10 flex justify-center">
        <Loader2 className="w-6 h-6 text-rose-600 animate-spin" />
      </div>
    ),
  }
);

const TransferRegisterExports = dynamic(
  () => import("@/components/accounts/TransferRegisterExports"),
  { ssr: false }
);

const DONATION_PRINT_COLS = [
  { key: "no", label: "Donation #", get: (r) => r.donationNumber, pdfWidth: 28 },
  { key: "date", label: "Date", get: (r) => formatDate(r.donationDate), pdfWidth: 24 },
  { key: "purpose", label: "Purpose", get: (r) => r.purpose, pdfWidth: 32 },
  { key: "beneficiary", label: "Beneficiary", get: (r) => r.beneficiary || "—", pdfWidth: 32 },
  { key: "cash", label: "Cash account", get: (r) => r.cashAccount?.name || "—", pdfWidth: 36 },
  { key: "amt", label: "Amount", align: "right", get: (r) => formatCurrency(r.amount), pdfWidth: 28 },
];

export default function DonationsPage() {
  const { showToast } = useToast();
  const defaultCashAccountId = useDefaultCashAccountId();
  const printRef = useRef(null);

  const [donations, setDonations] = useState([]);
  const [summary, setSummary] = useState({ count: 0, total: 0 });
  const [accounts, setAccounts] = useState([]);
  const [registerLoading, setRegisterLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyDonationForm());
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [companySettings, setCompanySettings] = useState(null);

  const cashAccounts = useMemo(
    () => accounts.filter((a) => a.isActive !== false && a.category === "cash"),
    [accounts]
  );

  const fetchDonations = useCallback(async () => {
    setRegisterLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      const res = await fetch(`/api/donations?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setDonations(data.donations || []);
        setSummary(data.summary || { count: 0, total: 0 });
      } else showToast(data.error || "Failed to load donations", "error");
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setRegisterLoading(false);
    }
  }, [fromDate, toDate, showToast]);

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((d) => {
        if (d.accounts) setAccounts(d.accounts);
      })
      .catch(() => {});

    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) setCompanySettings(d.settings);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  const filteredDonations = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return donations;
    return donations.filter(
      (row) =>
        row.donationNumber?.toLowerCase().includes(q) ||
        row.purpose?.toLowerCase().includes(q) ||
        row.beneficiary?.toLowerCase().includes(q) ||
        row.cashAccount?.name?.toLowerCase().includes(q) ||
        row.notes?.toLowerCase().includes(q)
    );
  }, [donations, searchQuery]);

  const filteredTotal = filteredDonations.reduce((sum, row) => sum + (row.amount || 0), 0);

  const openCreate = () => {
    const next = emptyDonationForm();
    if (defaultCashAccountId) {
      next.cashAccountId = String(defaultCashAccountId);
    }
    setForm(next);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Donation ${data.donation?.donationNumber || ""} posted`, "success");
        setModalOpen(false);
        setForm(emptyDonationForm());
        fetchDonations();
        fetch("/api/accounts")
          .then((r) => r.json())
          .then((d) => {
            if (d.accounts) setAccounts(d.accounts);
          })
          .catch(() => {});
      } else {
        showToast(data.error || "Failed to post donation", "error");
      }
    } catch {
      showToast("Error processing request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="erp-donation-surface page-enter pb-8">
      <div className="erp-finance-page space-y-5">
        <header className="erp-don-page-header">
          <div>
            <div className="erp-don-page-badge">
              <Heart className="w-3.5 h-3.5" />
              Finance · Charitable giving
            </div>
            <h1 className="erp-don-page-title">Donations</h1>
            <p className="erp-don-page-desc">
              Record charitable donations paid from cash. Each entry debits donations expense and credits your cash account in the general ledger.
            </p>
          </div>
          <div className="erp-don-header-actions">
            <Link href="/accounts">
              <Button variant="outline" className="erp-don-btn-ghost">
                <ArrowLeft className="w-4 h-4" /> Accounts
              </Button>
            </Link>
            <Button onClick={openCreate} className="erp-don-btn-primary">
              <Plus className="w-4 h-4" /> New donation
            </Button>
          </div>
        </header>

        <div className="erp-don-stats">
          <div className="erp-don-stat">
            <div className="erp-don-stat-icon is-count">
              <Hash className="w-4 h-4" />
            </div>
            <div>
              <p className="erp-don-stat-label">Total donations</p>
              <p className="erp-don-stat-value">{summary.count}</p>
            </div>
          </div>
          <div className="erp-don-stat">
            <div className="erp-don-stat-icon is-cash">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <p className="erp-don-stat-label">Cash accounts</p>
              <p className="erp-don-stat-value">{cashAccounts.length}</p>
            </div>
          </div>
          <div className="erp-don-stat">
            <div className="erp-don-stat-icon is-value">
              <HandHeart className="w-4 h-4" />
            </div>
            <div>
              <p className="erp-don-stat-label">Total given</p>
              <p className="erp-don-stat-value">{formatCurrency(summary.total)}</p>
            </div>
          </div>
          <div className="erp-don-stat">
            <div className="erp-don-stat-icon is-period">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <p className="erp-don-stat-label">This view</p>
              <p className="erp-don-stat-value">{formatCurrency(filteredTotal)}</p>
            </div>
          </div>
        </div>

        <div className="erp-don-toolbar">
          <div className="erp-don-search-wrap">
            <Search className="erp-don-search-icon" />
            <input
              type="text"
              placeholder="Search donation #, purpose, beneficiary..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="erp-don-date-input"
              aria-label="From date"
            />
            <span className="text-xs font-medium text-slate-400">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="erp-don-date-input"
              aria-label="To date"
            />
          </div>
        </div>

        <TransferRegisterExports
          printRef={printRef}
          title="Donations Register"
          subtitle={`${filteredDonations.length} donations`}
          company={companySettings}
          columns={DONATION_PRINT_COLS}
          rows={filteredDonations}
          footers={[{
            label: "Total donated",
            value: formatCurrency(filteredTotal),
            valueColumn: "amt",
            labelColumn: "cash",
          }]}
          filename={`donations-${new Date().toISOString().slice(0, 10)}.pdf`}
          toolbarSlot={(toolbar) => (
            <div className="erp-don-register">
              <div className="erp-don-register-head">
                <div>
                  <p className="erp-don-register-title">Donation register</p>
                  <p className="erp-don-register-meta">
                    {filteredDonations.length} record{filteredDonations.length === 1 ? "" : "s"} · cash charitable payments
                  </p>
                </div>
                {toolbar}
              </div>
              <DonationsRegister donations={filteredDonations} loading={registerLoading} />
            </div>
          )}
        />
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Record donation" size="lg">
        {modalOpen && (
          <DonationForm
            form={form}
            onChange={setForm}
            cashAccounts={cashAccounts}
            submitting={submitting}
            onSubmit={handleSubmit}
            onCancel={() => setModalOpen(false)}
          />
        )}
      </Modal>
    </div>
  );
}

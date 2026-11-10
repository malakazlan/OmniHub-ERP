"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/Button";
import MoneyTransfersRegister from "@/components/accounts/MoneyTransfersRegister";
import { emptyTransferForm } from "@/components/accounts/MoneyTransferForm";
import {
  ArrowRightLeft, Plus, Loader2, ArrowLeft, Search, Banknote, Building2, Wallet, ArrowDownLeft,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { useDefaultCashAccountId } from "@/hooks/useDefaultCashAccount";
import { transferTypeLabel, TRANSFER_TYPES } from "@/lib/moneyTransfer";

const MoneyTransferForm = dynamic(
  () => import("@/components/accounts/MoneyTransferForm"),
  {
    ssr: false,
    loading: () => (
      <div className="py-10 flex justify-center">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    ),
  }
);

const TransferRegisterExports = dynamic(
  () => import("@/components/accounts/TransferRegisterExports"),
  { ssr: false }
);

const TRANSFER_PRINT_COLS = [
  { key: "no", label: "Transfer #", get: (r) => r.transferNumber, pdfWidth: 28 },
  { key: "date", label: "Date", get: (r) => formatDate(r.transferDate), pdfWidth: 24 },
  { key: "type", label: "Type", get: (r) => transferTypeLabel(r.transferType), pdfWidth: 24 },
  { key: "from", label: "From", get: (r) => r.fromAccount?.name || "—", pdfWidth: 36 },
  { key: "to", label: "To", get: (r) => r.toAccount?.name || "—", pdfWidth: 36 },
  { key: "amt", label: "Amount", align: "right", get: (r) => formatCurrency(r.amount), pdfWidth: 28 },
];

const TYPE_STRIP_ICONS = {
  cash_cash: Wallet,
  cash_bank: Banknote,
  bank_bank: Building2,
  bank_cash: ArrowDownLeft,
};

const TYPE_STRIP_ICON_CLASS = {
  cash_cash: "cash-cash",
  cash_bank: "cash-bank",
  bank_bank: "bank-bank",
  bank_cash: "bank-cash",
};

export default function MoneyTransfersPage() {
  const { showToast } = useToast();
  const defaultCashAccountId = useDefaultCashAccountId();
  const printRef = useRef(null);

  const [transfers, setTransfers] = useState([]);
  const [summary, setSummary] = useState({ count: 0, total: 0 });
  const [accounts, setAccounts] = useState([]);
  const [registerLoading, setRegisterLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyTransferForm());
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [companySettings, setCompanySettings] = useState(null);

  const transferAccounts = useMemo(
    () => accounts.filter((a) => a.isActive !== false && (a.category === "cash" || a.category === "bank")),
    [accounts]
  );

  const cashCount = transferAccounts.filter((a) => a.category === "cash").length;
  const bankCount = transferAccounts.filter((a) => a.category === "bank").length;

  const fetchTransfers = useCallback(async () => {
    setRegisterLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      const res = await fetch(`/api/transfers?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setTransfers(data.transfers || []);
        setSummary(data.summary || { count: 0, total: 0 });
      } else showToast(data.error || "Failed to load transfers", "error");
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
    fetchTransfers();
  }, [fetchTransfers]);

  const filteredTransfers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return transfers;
    return transfers.filter(
      (row) =>
        row.transferNumber?.toLowerCase().includes(q) ||
        row.fromAccount?.name?.toLowerCase().includes(q) ||
        row.toAccount?.name?.toLowerCase().includes(q) ||
        row.description?.toLowerCase().includes(q) ||
        transferTypeLabel(row.transferType).toLowerCase().includes(q)
    );
  }, [transfers, searchQuery]);

  const filteredTotal = filteredTransfers.reduce((sum, row) => sum + (row.amount || 0), 0);

  const openCreate = (transferType = "cash_cash") => {
    const next = emptyTransferForm(transferType);
    if (defaultCashAccountId) {
      if (transferType === "cash_cash" || transferType === "cash_bank") {
        next.fromAccountId = String(defaultCashAccountId);
      }
      if (transferType === "bank_cash") {
        next.toAccountId = String(defaultCashAccountId);
      }
    }
    setForm(next);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Transfer ${data.transfer?.transferNumber || ""} posted`, "success");
        setModalOpen(false);
        setForm(emptyTransferForm());
        fetchTransfers();
        fetch("/api/accounts")
          .then((r) => r.json())
          .then((d) => {
            if (d.accounts) setAccounts(d.accounts);
          })
          .catch(() => {});
      } else {
        showToast(data.error || "Failed to post transfer", "error");
      }
    } catch {
      showToast("Error processing request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="erp-transfer-surface page-enter pb-8">
      <div className="erp-finance-page space-y-5">
        <header className="erp-xfer-page-header">
          <div>
            <div className="erp-xfer-page-badge">
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Finance · Internal Transfers
            </div>
            <h1 className="erp-xfer-page-title">Transfers</h1>
            <p className="erp-xfer-page-desc">
              Securely move funds between cash and bank accounts. Every transfer posts to the general ledger automatically.
            </p>
          </div>
          <div className="erp-xfer-header-actions">
            <Link href="/accounts">
              <Button variant="outline" className="erp-xfer-btn-ghost">
                <ArrowLeft className="w-4 h-4" /> Accounts
              </Button>
            </Link>
            <Button onClick={() => openCreate()} className="erp-xfer-btn-primary">
              <Plus className="w-4 h-4" /> New transfer
            </Button>
          </div>
        </header>

        <div className="erp-xfer-stats">
          <div className="erp-xfer-stat">
            <div className="erp-xfer-stat-icon is-total">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <p className="erp-xfer-stat-label">Total transfers</p>
              <p className="erp-xfer-stat-value">{summary.count}</p>
            </div>
          </div>
          <div className="erp-xfer-stat">
            <div className="erp-xfer-stat-icon is-cash">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <p className="erp-xfer-stat-label">Cash accounts</p>
              <p className="erp-xfer-stat-value">{cashCount}</p>
            </div>
          </div>
          <div className="erp-xfer-stat">
            <div className="erp-xfer-stat-icon is-bank">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <p className="erp-xfer-stat-label">Bank accounts</p>
              <p className="erp-xfer-stat-value">{bankCount}</p>
            </div>
          </div>
          <div className="erp-xfer-stat">
            <div className="erp-xfer-stat-icon is-value">
              <Banknote className="w-4 h-4" />
            </div>
            <div>
              <p className="erp-xfer-stat-label">Transferred value</p>
              <p className="erp-xfer-stat-value">{formatCurrency(summary.total)}</p>
            </div>
          </div>
        </div>

        <div className="erp-xfer-type-strip">
          {Object.values(TRANSFER_TYPES).map((type) => {
            const Icon = TYPE_STRIP_ICONS[type.id];
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => openCreate(type.id)}
                className="erp-xfer-type-card text-left hover:border-blue-200 hover:shadow-md transition-all cursor-pointer"
              >
                <div className={`erp-xfer-type-card-icon ${TYPE_STRIP_ICON_CLASS[type.id]}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="erp-xfer-type-card-title">{type.label}</p>
                  <p className="erp-xfer-type-card-desc">{type.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="erp-xfer-toolbar">
          <div className="erp-xfer-search-wrap">
            <Search className="erp-xfer-search-icon" />
            <input
              type="text"
              placeholder="Search transfer #, account, or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="erp-xfer-date-input"
              aria-label="From date"
            />
            <span className="text-xs font-medium text-slate-400">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="erp-xfer-date-input"
              aria-label="To date"
            />
          </div>
        </div>

        <TransferRegisterExports
          printRef={printRef}
          title="Transfers Register"
          subtitle={`${filteredTransfers.length} transfers`}
          company={companySettings}
          columns={TRANSFER_PRINT_COLS}
          rows={filteredTransfers}
          footers={[{
            label: "Total transferred",
            value: formatCurrency(filteredTotal),
            valueColumn: "amt",
            labelColumn: "to",
          }]}
          filename={`money-transfers-${new Date().toISOString().slice(0, 10)}.pdf`}
          toolbarSlot={(toolbar) => (
            <div className="erp-xfer-register">
              <div className="erp-xfer-register-head">
                <div>
                  <p className="erp-xfer-register-title">Transfer register</p>
                  <p className="erp-xfer-register-meta">
                    {filteredTransfers.length} record{filteredTransfers.length === 1 ? "" : "s"} · cash ↔ bank transfers
                  </p>
                </div>
                {toolbar}
              </div>
              <MoneyTransfersRegister transfers={filteredTransfers} loading={registerLoading} />
            </div>
          )}
        />
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Post transfer" size="xl">
        {modalOpen && (
          <MoneyTransferForm
            form={form}
            onChange={setForm}
            accounts={transferAccounts}
            submitting={submitting}
            onSubmit={handleSubmit}
            onCancel={() => setModalOpen(false)}
          />
        )}
      </Modal>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { useToast } from "@/context/ToastContext";
import { StatCard } from "@/components/layout/PageHeader";
import GeneralLedgerRegister from "@/components/accounts/GeneralLedgerRegister";
import GeneralLedgerPrintView from "@/components/accounts/GeneralLedgerPrintView";
import GeneralLedgerFilters from "@/components/accounts/GeneralLedgerFilters";
import { LedgerPaymentModal } from "@/components/accounts/LedgerPaymentModal";
import { PurchaseReceiptPanel } from "@/components/documents/PurchaseReceiptPanel";
import { SaleInvoicePanel } from "@/components/documents/SaleInvoicePanel";
import { PaymentReceiptPanel } from "@/components/documents/PaymentReceiptPanel";
import { ledgerEntryOpensInvoice } from "@/lib/ledgerEnrichment";
import {
  filterLedgerEntries,
  formatLedgerTotals,
  ledgerPrintTitle,
  filterAccountsForLedger,
} from "@/lib/ledgerExport";
import { downloadLedgerPdf } from "@/lib/ledgerPdf";
import {
  Loader2, ArrowDownCircle, ArrowUpCircle,
  Hash, Wallet, Phone,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import {
  isVendorLedgerAccount,
} from "@/components/purchases/UnpaidPurchaseBillsPanel";
import {
  isCustomerLedgerAccount,
} from "@/components/sales/UnpaidSaleInvoicesPanel";

const CATEGORY_LABELS = {
  cash: "Cash",
  bank: "Bank",
  farmer: "Farmer",
  company: "Company",
  shop: "Shop",
  salary: "Employee",
  transport: "Driver Accounts",
};

export default function GeneralLedgerPage() {
  const { showToast } = useToast();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [account, setAccount] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [entryTypeFilter, setEntryTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const printRef = useRef(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const [modalMode, setModalMode] = useState(null);
  const [billsRefreshKey, setBillsRefreshKey] = useState(0);
  const [outstandingPurchases, setOutstandingPurchases] = useState([]);
  const [outstandingSales, setOutstandingSales] = useState([]);
  const [docLoading, setDocLoading] = useState(false);
  const [purchaseDoc, setPurchaseDoc] = useState(null);
  const [saleDoc, setSaleDoc] = useState(null);
  const [companySettings, setCompanySettings] = useState(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const [paymentReceiptOpen, setPaymentReceiptOpen] = useState(false);

  useEffect(() => {
    async function loadAccounts() {
      try {
        const res = await fetch("/api/accounts");
        const data = await res.json();
        if (res.ok) setAccounts(data.accounts || []);
      } catch {
        /* ignore */
      }
    }
    loadAccounts();
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => { if (d.settings) setCompanySettings(d.settings); })
      .catch(() => {});
  }, []);

  const fetchLedger = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedAccountId) params.set("accountId", selectedAccountId);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const qs = params.toString();
      const url = qs ? `/api/accounts/ledger?${qs}` : "/api/accounts/ledger";
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setAccount(data.account || null);
        setEntries(data.entries || []);
      } else {
        showToast(data.error || "Failed to load ledger", "error");
      }
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId, dateFrom, dateTo]);

  useEffect(() => { fetchLedger(); }, [fetchLedger]);

  useEffect(() => {
    if (!selectedAccountId || !account) {
      setOutstandingPurchases([]);
      setOutstandingSales([]);
      return;
    }
    if (isVendorLedgerAccount(account)) {
      fetch(`/api/purchases?ledgerAccountId=${selectedAccountId}&outstanding=true`)
        .then((r) => r.json())
        .then((d) => setOutstandingPurchases(d.purchases || []))
        .catch(() => setOutstandingPurchases([]));
    } else {
      setOutstandingPurchases([]);
    }
    if (isCustomerLedgerAccount(account)) {
      fetch(`/api/sales?ledgerAccountId=${selectedAccountId}&outstanding=true`)
        .then((r) => r.json())
        .then((d) => setOutstandingSales(d.sales || []))
        .catch(() => setOutstandingSales([]));
    } else {
      setOutstandingSales([]);
    }
  }, [selectedAccountId, account, billsRefreshKey]);

  const purchaseTotalDue = useMemo(
    () => outstandingPurchases.reduce(
      (sum, b) => sum + Math.max((b.totalAmount || 0) - (b.paidAmount || 0), 0),
      0
    ),
    [outstandingPurchases]
  );

  const salesTotalDue = useMemo(
    () => outstandingSales.reduce(
      (sum, s) => sum + Math.max((s.totalAmount || 0) - (s.paidAmount || 0), 0),
      0
    ),
    [outstandingSales]
  );

  const openPay = () => {
    if (!selectedAccountId) {
      showToast("Select an account first", "warning");
      return;
    }
    setModalMode("pay");
  };

  const openReceive = () => {
    if (!selectedAccountId) {
      showToast("Select an account first", "warning");
      return;
    }
    setModalMode("receive");
  };

  const closeModal = () => setModalMode(null);

  const handlePaymentSuccess = (receipt) => {
    setBillsRefreshKey((k) => k + 1);
    fetchLedger();
    if (receipt) {
      setPaymentReceipt(receipt);
      setPaymentReceiptOpen(true);
    }
  };

  const filteredAccounts = useMemo(
    () =>
      filterAccountsForLedger(accounts, entries, {
        category: categoryFilter,
        entryType: entryTypeFilter,
        dateFrom,
        dateTo,
      }),
    [accounts, entries, categoryFilter, entryTypeFilter, dateFrom, dateTo]
  );

  useEffect(() => {
    if (!selectedAccountId) return;
    const stillVisible = filteredAccounts.some(
      (a) => String(a.id) === String(selectedAccountId)
    );
    if (!stillVisible) setSelectedAccountId("");
  }, [filteredAccounts, selectedAccountId]);

  const filteredEntries = useMemo(
    () =>
      filterLedgerEntries(
        entries,
        {
          search: searchQuery,
          category: selectedAccountId ? "" : categoryFilter,
          entryType: entryTypeFilter,
          dateFrom: "",
          dateTo: "",
        },
        account?.phone || ""
      ),
    [entries, searchQuery, categoryFilter, entryTypeFilter, selectedAccountId, account?.phone]
  );

  const totals = useMemo(() => formatLedgerTotals(filteredEntries), [filteredEntries]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      categoryFilter ||
      entryTypeFilter ||
      dateFrom ||
      dateTo
  );

  const clearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("");
    setEntryTypeFilter("");
    setDateFrom("");
    setDateTo("");
  };

  const LEDGER_PRINT_STYLE = `
    @page { size: A4 landscape; margin: 10mm; }
    @media print {
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  `;

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: ledgerPrintTitle(account, companySettings?.company_name).replace(/[^\w\s-]/g, ""),
    pageStyle: LEDGER_PRINT_STYLE,
  });

  const onPrintLedger = () => {
    if (filteredEntries.length === 0) {
      showToast("No entries to print", "warning");
      return;
    }
    handlePrint();
  };

  const handleExportPdf = async () => {
    if (filteredEntries.length === 0) {
      showToast("No entries to export", "warning");
      return;
    }
    setPdfLoading(true);
    try {
      const slug = (account?.name || "general-ledger").replace(/\s+/g, "-").toLowerCase();
      downloadLedgerPdf({
        entries: filteredEntries,
        showAccountColumn: !selectedAccountId,
        company: companySettings,
        account,
        totals,
        title: ledgerPrintTitle(account, companySettings?.company_name),
        filename: `ledger-${slug}-${new Date().toISOString().slice(0, 10)}.pdf`,
      });
      showToast("PDF downloaded", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to generate PDF", "error");
    } finally {
      setPdfLoading(false);
    }
  };

  const totalDebit = totals.debit;
  const totalCredit = totals.credit;
  const selectedAccountName = account?.name || "";
  const netMovement = totalDebit - totalCredit;

  const openLedgerDocument = async (row) => {
    if (!ledgerEntryOpensInvoice(row)) return;

    setDocLoading(true);
    try {
      if (row.referenceType === "PurchaseOrder") {
        const res = await fetch(`/api/purchases/${row.referenceId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load purchase");
        setPurchaseDoc(data.purchase);
        setReceiptOpen(true);
      } else if (row.referenceType === "SaleOrder") {
        const res = await fetch(`/api/sales/${row.referenceId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load sale");
        setSaleDoc(data.sale);
        setInvoiceOpen(true);
      }
    } catch (err) {
      showToast(err.message || "Could not open document", "error");
    } finally {
      setDocLoading(false);
    }
  };

  const printMeta = {
    title: ledgerPrintTitle(account, companySettings?.company_name),
    subtitle: selectedAccountId
      ? `Account ledger · ${selectedAccountName}${account?.code ? ` (${account.code})` : ""}`
      : "All accounts register",
    phone: account?.phone || "",
  };

  return (
    <div className="space-y-6 page-enter erp-ledger-page pb-8">
      <h1 className="text-xl font-bold text-slate-900 tracking-tight">General Ledger</h1>

      {/* Account summary */}
      {selectedAccountId && account && (
        <div className="erp-ledger-toolbar p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="erp-ledger-account-chip">
              <Wallet className="w-3.5 h-3.5" />
              {CATEGORY_LABELS[account.category] || account.category}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900">{account.name}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                {account.code && (
                  <p className="text-[11px] font-mono text-slate-400">{account.code}</p>
                )}
                {account.phone && (
                  <p className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {account.phone}
                  </p>
                )}
              </div>
            </div>
            <div className="ml-auto text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Running balance</p>
              <p className={`text-xl font-black font-mono tabular-nums ${account.balance >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                {formatCurrency(account.balance)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {selectedAccountId ? (
          <StatCard
            module="accounts"
            label="Account balance"
            value={formatCurrency(account?.balance ?? 0)}
            icon={Wallet}
            valueClassName={account?.balance >= 0 ? "text-emerald-700" : "text-rose-600"}
          />
        ) : (
          <StatCard module="accounts" label="Active accounts" value={accounts.length} icon={Wallet} />
        )}
        <StatCard module="accounts" label="Total debit" value={formatCurrency(totalDebit)} icon={ArrowDownCircle} valueClassName="text-rose-600" />
        <StatCard module="accounts" label="Total credit" value={formatCurrency(totalCredit)} icon={ArrowUpCircle} valueClassName="text-emerald-700" />
        <StatCard
          module="accounts"
          label="Net movement"
          value={formatCurrency(Math.abs(netMovement))}
          icon={Hash}
          subtext={netMovement >= 0 ? "Debit excess" : "Credit excess"}
        />
      </div>

      {/* Register */}
      <div className="erp-ledger-register">
        <GeneralLedgerFilters
          search={searchQuery}
          onSearchChange={setSearchQuery}
          category={categoryFilter}
          onCategoryChange={setCategoryFilter}
          entryType={entryTypeFilter}
          onEntryTypeChange={setEntryTypeFilter}
          dateFrom={dateFrom}
          onDateFromChange={setDateFrom}
          dateTo={dateTo}
          onDateToChange={setDateTo}
          onClear={clearFilters}
          onPrint={onPrintLedger}
          onExportPdf={handleExportPdf}
          pdfLoading={pdfLoading}
          resultCount={filteredEntries.length}
          totalCount={entries.length}
          hasActiveFilters={hasActiveFilters}
          accounts={accounts}
          entries={entries}
          selectedAccountId={selectedAccountId}
          onSelectAccount={setSelectedAccountId}
          onPayOut={openPay}
          onReceiveIn={openReceive}
        />

        {docLoading && (
          <p className="text-xs text-slate-600 px-4 py-2 flex items-center gap-2 bg-slate-50 border-b border-slate-100 no-print">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Opening invoice…
          </p>
        )}

        <GeneralLedgerRegister
          entries={filteredEntries}
          showAccountColumn={!selectedAccountId}
          loading={loading}
          onOpenDocument={openLedgerDocument}
          totals={filteredEntries.length > 0 ? totals : null}
        />

        <div className="erp-ledger-print-host" aria-hidden>
          <GeneralLedgerPrintView
            ref={printRef}
            entries={filteredEntries}
            showAccountColumn={!selectedAccountId}
            totals={filteredEntries.length > 0 ? totals : null}
            printMeta={printMeta}
          />
        </div>
      </div>

      <LedgerPaymentModal
        open={modalMode !== null}
        mode={modalMode}
        account={account}
        selectedAccountId={selectedAccountId}
        accounts={accounts}
        billsRefreshKey={billsRefreshKey}
        purchaseTotalDue={purchaseTotalDue}
        salesTotalDue={salesTotalDue}
        outstandingPurchases={outstandingPurchases}
        outstandingSales={outstandingSales}
        onClose={closeModal}
        onSuccess={handlePaymentSuccess}
      />

      <PaymentReceiptPanel
        receipt={paymentReceipt}
        company={companySettings}
        open={paymentReceiptOpen}
        onClose={() => {
          setPaymentReceiptOpen(false);
          setPaymentReceipt(null);
        }}
      />

      <PurchaseReceiptPanel
        purchase={purchaseDoc}
        company={companySettings}
        open={receiptOpen}
        onClose={() => { setReceiptOpen(false); setPurchaseDoc(null); }}
        title="Purchase bill"
      />

      <SaleInvoicePanel
        sale={saleDoc}
        company={companySettings}
        open={invoiceOpen}
        onClose={() => { setInvoiceOpen(false); setSaleDoc(null); }}
      />
    </div>
  );
}

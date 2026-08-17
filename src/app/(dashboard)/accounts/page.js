"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/Button";
import AccountRegisterModal from "@/components/accounts/AccountRegisterModal";
import AccountEditModal from "@/components/accounts/AccountEditModal";
import AccountsRegister from "@/components/accounts/AccountsRegister";
import RegisterPrintView from "@/components/reports/RegisterPrintView";
import RegisterExportToolbar from "@/components/reports/RegisterExportToolbar";
import { useRegisterExport } from "@/hooks/useRegisterExport";
import { DirectoryAdminNotice, confirmDirectoryDelete, useDirectoryAdmin } from "@/components/accounts/DirectoryAdminActions";
import {
  BookOpen, Loader2, Landmark, Users, Wallet,
  Banknote, Building, Store, Plus, Search, Sprout, Truck, Car, X,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

const PROJECT_CATEGORIES = ["cash", "bank", "farmer", "company", "shop", "salary", "transport", "vehicle"];

const CATEGORY_LABELS = {
  cash: "Cash",
  bank: "Bank",
  farmer: "Farmers",
  company: "Companies",
  shop: "Shops",
  salary: "Employees",
  transport: "Drivers",
  vehicle: "Vehicles",
};

const CATEGORY_ICONS = {
  cash: Banknote,
  bank: Landmark,
  farmer: Sprout,
  company: Building,
  shop: Store,
  salary: Users,
  transport: Truck,
  vehicle: Car,
};

const STAT_CARDS = [
  { key: "count", label: "Total accounts", icon: Users, tone: "teal", format: (v) => String(v) },
  { key: "cashBank", label: "Cash & bank", icon: Wallet, tone: "emerald", format: formatCurrency },
  { key: "receivable", label: "Receivables", icon: Store, tone: "amber", format: formatCurrency },
  { key: "payable", label: "Payables", icon: Landmark, tone: "rose", format: formatCurrency },
];

function accountPrintColumns(showCategory, categoryLabels) {
  const cols = [
    { key: "name", label: "Account", get: (r) => r.party?.name || r.name, pdfWidth: 45 },
    { key: "code", label: "Code", get: (r) => r.code || "—", pdfWidth: 18 },
  ];
  if (showCategory) {
    cols.push({ key: "cat", label: "Category", get: (r) => categoryLabels[r.category] || r.category, pdfWidth: 22 });
  }
  cols.push(
    { key: "phone", label: "Phone", get: (r) => r.party?.phone || r.phone || "—", pdfWidth: 24 },
    { key: "city", label: "City", get: (r) => r.party?.city || r.city || "—", pdfWidth: 22 },
    {
      key: "balance",
      label: "Balance",
      align: "right",
      pdfWidth: 28,
      get: (r) => formatCurrency(r.balance),
      tone: (r) => (r.balance < 0 ? "danger" : r.balance > 0 ? "success" : undefined),
    },
    { key: "status", label: "Status", get: (r) => (r.isActive !== false ? "Active" : "Inactive"), pdfWidth: 18 }
  );
  return cols;
}

function AccountsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const isAdmin = useDirectoryAdmin();
  const printRef = useRef(null);

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [companySettings, setCompanySettings] = useState(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      if (res.ok) {
        const list = (data.accounts || []).filter((a) => PROJECT_CATEGORIES.includes(a.category));
        setAccounts(list);
      } else showToast(data.error || "Failed to load accounts", "error");
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => { if (d.settings) setCompanySettings(d.settings); }).catch(() => {});
  }, []);

  useEffect(() => {
    const cat = searchParams.get("category");
    const create = searchParams.get("create");
    if (cat === "all" || !cat) setActiveCategory("all");
    else if (PROJECT_CATEGORIES.includes(cat)) setActiveCategory(cat);
    else router.replace("/accounts", { scroll: false });
    if (create === "1" && cat && PROJECT_CATEGORIES.includes(cat)) setModalOpen(true);
  }, [searchParams, router]);

  const updateUrl = (category, create = false) => {
    const params = new URLSearchParams();
    if (category && category !== "all") params.set("category", category);
    else if (category === "all") params.set("category", "all");
    if (create) params.set("create", "1");
    const qs = params.toString();
    router.replace(qs ? `/accounts?${qs}` : "/accounts", { scroll: false });
  };

  const selectCategory = (slug) => {
    setActiveCategory(slug);
    setSearchQuery("");
    updateUrl(slug);
  };

  const openCreateModal = () => {
    setModalOpen(true);
    updateUrl(activeCategory, true);
  };

  const handleEditAccount = useCallback((row) => {
    setEditingAccount(row);
    setEditModalOpen(true);
  }, []);

  const handleDeleteAccount = useCallback(async (row) => {
    if (!(await confirmDirectoryDelete(row.name))) return;
    try {
      const res = await fetch(`/api/accounts/${row.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast("Account deleted", "success");
        fetchAccounts();
      } else {
        showToast(data.error || "Failed to delete account", "error");
      }
    } catch {
      showToast("Error connecting to server", "error");
    }
  }, [showToast, fetchAccounts]);

  const categoryCounts = useMemo(() => {
    const counts = { all: accounts.length };
    for (const slug of PROJECT_CATEGORIES) {
      counts[slug] = accounts.filter((a) => a.category === slug).length;
    }
    return counts;
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((a) => {
      const matchesCategory = activeCategory === "all" ? true : a.category === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        a.name.toLowerCase().includes(q) ||
        (a.code && a.code.toLowerCase().includes(q)) ||
        (a.phone && a.phone.toLowerCase().includes(q)) ||
        (a.party?.name && a.party.name.toLowerCase().includes(q)) ||
        (a.party?.subtitle && a.party.subtitle.toLowerCase().includes(q)) ||
        (a.party?.contactPerson && a.party.contactPerson.toLowerCase().includes(q)) ||
        (a.party?.phone && a.party.phone.toLowerCase().includes(q)) ||
        (a.party?.city && a.party.city.toLowerCase().includes(q)) ||
        (a.city && a.city.toLowerCase().includes(q))
      );
      return matchesCategory && matchesSearch;
    });
  }, [accounts, activeCategory, searchQuery]);

  const filteredBalance = useMemo(
    () => filteredAccounts.reduce((s, a) => s + a.balance, 0),
    [filteredAccounts]
  );

  const totalReceivable = accounts
    .filter((a) => a.category === "shop" && a.balance > 0)
    .reduce((s, a) => s + a.balance, 0);
  const totalPayable = accounts
    .filter((a) => ["farmer", "company", "salary", "transport"].includes(a.category) && a.balance > 0)
    .reduce((s, a) => s + a.balance, 0);
  const cashBankTotal = accounts
    .filter((a) => a.category === "cash" || a.category === "bank")
    .reduce((s, a) => s + a.balance, 0);

  const activeLabel = activeCategory === "all"
    ? "All accounts"
    : CATEGORY_LABELS[activeCategory] || activeCategory;

  const canCreate = isAdmin && activeCategory !== "all";

  const statValues = {
    count: accounts.length,
    cashBank: cashBankTotal,
    receivable: totalReceivable,
    payable: totalPayable,
  };

  const openAccountLedger = useCallback(
    (row) => router.push(`/accounts/ledger?accountId=${row.id}`),
    [router]
  );

  const printColumns = useMemo(
    () => accountPrintColumns(activeCategory === "all", CATEGORY_LABELS),
    [activeCategory]
  );

  const { pdfLoading, onPrint, onExportPdf } = useRegisterExport({
    printRef,
    title: `Account Register — ${activeLabel}`,
    subtitle: `${filteredAccounts.length} accounts`,
    company: companySettings,
    columns: printColumns,
    rows: filteredAccounts,
    footers: [{
      label: "Section balance",
      value: formatCurrency(filteredBalance),
      valueColumn: "balance",
      labelColumn: "city",
    }],
    filename: `accounts-${activeCategory}-${new Date().toISOString().slice(0, 10)}.pdf`,
  });

  if (loading && accounts.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center erp-accounts-surface">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="erp-accounts-surface page-enter pb-8">
      <div className="erp-accounts-page space-y-5">
        <header className="erp-ac-page-header">
          <div className="erp-ac-page-header-main">
            <div className="erp-ac-page-badge">
              <BookOpen className="w-3.5 h-3.5" />
              Accounts module
            </div>
            <h1 className="erp-ac-page-title">Account register</h1>
            <p className="erp-ac-page-desc">
              Master directory for cash, bank, suppliers, customers, staff, drivers, and vehicles — live balances, Excel-style grid.
            </p>
          </div>
          {canCreate && (
            <Button onClick={openCreateModal} className="erp-ac-add-btn bg-acc-accounts border-0 shrink-0">
              <Plus className="w-4 h-4" /> Add {CATEGORY_LABELS[activeCategory]}
            </Button>
          )}
        </header>

        <div className="erp-accounts-stats-bar">
          {STAT_CARDS.map((card) => {
            const Icon = card.icon;
            const value = statValues[card.key];
            return (
              <div key={card.key} className={`erp-ac-stat erp-ac-stat-${card.tone}`}>
                <div className="erp-ac-stat-icon">
                  <Icon className="w-4 h-4" strokeWidth={2.1} />
                </div>
                <div className="erp-ac-stat-body">
                  <p className="erp-ac-stat-label">{card.label}</p>
                  <p className="erp-ac-stat-value">{card.format(value)}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="erp-accounts-toolbar">
          <div className="erp-accounts-toolbar-row">
            <div className="erp-ac-category-tabs">
              <button
                type="button"
                onClick={() => selectCategory("all")}
                className={`erp-ac-tab${activeCategory === "all" ? " is-active" : ""}`}
                data-cat="all"
              >
                All
                <span className="erp-ac-tab-count">{categoryCounts.all}</span>
              </button>
              {PROJECT_CATEGORIES.map((slug) => {
                const Icon = CATEGORY_ICONS[slug];
                return (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => selectCategory(slug)}
                    className={`erp-ac-tab${activeCategory === slug ? " is-active" : ""}`}
                    data-cat={slug}
                  >
                    <Icon className="w-3 h-3 shrink-0" strokeWidth={2.25} />
                    {CATEGORY_LABELS[slug]}
                    <span className="erp-ac-tab-count">{categoryCounts[slug]}</span>
                  </button>
                );
              })}
            </div>

            <div className="erp-ac-search-wrap">
              <Search className="erp-ac-search-icon" />
              <input
                type="text"
                placeholder="Search name, code, phone, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="erp-ac-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="erp-ac-search-clear"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {isAdmin && <DirectoryAdminNotice />}

        <div className="erp-accounts-register">
          <div className="erp-accounts-register-head">
            <div>
              <p className="erp-accounts-register-title">{activeLabel}</p>
              <p className="erp-accounts-register-meta">
                {filteredAccounts.length} record{filteredAccounts.length === 1 ? "" : "s"}
                {searchQuery ? ` · filtered by “${searchQuery}”` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="erp-ac-section-balance">
                <p className="erp-ac-section-balance-label">Section balance</p>
                <p className={`erp-ac-section-balance-value ${filteredBalance >= 0 ? "is-pos" : "is-neg"}`}>
                  {formatCurrency(filteredBalance)}
                </p>
              </div>
              <RegisterExportToolbar
                onPrint={onPrint}
                onExportPdf={onExportPdf}
                pdfLoading={pdfLoading}
                disabled={filteredAccounts.length === 0}
                resultCount={filteredAccounts.length}
                label="accounts"
              />
            </div>
          </div>

          {filteredAccounts.length === 0 && !loading ? (
            <div className="erp-ac-empty">
              <BookOpen className="w-10 h-10 text-teal-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-600">No accounts found</p>
              {canCreate && (
                <>
                  <p className="text-xs text-slate-400 mt-1 mb-4">Register the first account in this category.</p>
                  <Button onClick={openCreateModal} className="bg-acc-accounts border-0">
                    <Plus className="w-4 h-4" /> New account
                  </Button>
                </>
              )}
            </div>
          ) : (
            <AccountsRegister
              rows={filteredAccounts}
              loading={loading}
              showCategory={activeCategory === "all"}
              showActions={isAdmin}
              categoryLabels={CATEGORY_LABELS}
              totalBalance={filteredBalance}
              onRowClick={openAccountLedger}
              onEdit={handleEditAccount}
              onDelete={handleDeleteAccount}
            />
          )}
        </div>
      </div>

      {activeCategory !== "all" && (
        <AccountRegisterModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            updateUrl(activeCategory, false);
          }}
          category={activeCategory}
          onSuccess={fetchAccounts}
        />
      )}

      <AccountEditModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingAccount(null);
        }}
        account={editingAccount}
        onSuccess={fetchAccounts}
      />

      <div className="erp-register-print-host" aria-hidden>
        <RegisterPrintView
          ref={printRef}
          title={`Account Register — ${activeLabel}`}
          company={companySettings}
          columns={printColumns}
          rows={filteredAccounts}
          footers={[{
            label: "Section balance",
            value: formatCurrency(filteredBalance),
            valueColumn: "balance",
            labelColumn: "city",
          }]}
        />
      </div>
    </div>
  );
}

export default function AccountsPage() {
  return (
    <Suspense fallback={<div className="min-h-[400px] flex items-center justify-center"><Loader2 className="w-8 h-8 text-teal-600 animate-spin" /></div>}>
      <AccountsPageContent />
    </Suspense>
  );
}

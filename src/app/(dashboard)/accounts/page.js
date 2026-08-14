"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/Button";
import AccountRegisterModal from "@/components/accounts/AccountRegisterModal";
import AccountEditModal from "@/components/accounts/AccountEditModal";
import { DirectoryAdminNotice, DirectoryAdminActions, confirmDirectoryDelete, useDirectoryAdmin } from "@/components/accounts/DirectoryAdminActions";
import { PageHeader, StatCard } from "@/components/layout/PageHeader";
import {
  BookOpen, Loader2, Landmark, Users, Wallet,
  Banknote, Building, Store, Plus, Search, ArrowLeft, Sprout, Truck,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

/** Project account categories only — no ledger / operating expense buckets */
const PROJECT_CATEGORIES = ["cash", "bank", "farmer", "company", "shop", "salary", "transport"];

const CATEGORY_LABELS = {
  cash: "Cash",
  bank: "Bank",
  farmer: "Farmers",
  company: "Companies",
  shop: "Shops",
  salary: "Employees",
  transport: "Driver Accounts",
};

const CATEGORY_DESC = {
  cash: "Petty cash & office tills",
  bank: "Company bank accounts",
  farmer: "Raw material suppliers",
  company: "Suppliers & buyers",
  shop: "Retail & wholesale customers",
  salary: "Staff salary accounts",
  transport: "Driver payables & freight staff",
};

const CATEGORY_ICONS = {
  cash: Banknote,
  bank: Landmark,
  farmer: Sprout,
  company: Building,
  shop: Store,
  salary: Users,
  transport: Truck,
};

const CATEGORY_ACCENT = {
  cash: "border-t-violet-500",
  bank: "border-t-blue-500",
  farmer: "border-t-emerald-500",
  company: "border-t-sky-500",
  shop: "border-t-amber-500",
  salary: "border-t-pink-500",
  transport: "border-t-cyan-500",
};

const CATEGORY_GROUPS = [
  {
    title: "Financial",
    items: ["cash", "bank"],
  },
  {
    title: "Suppliers",
    items: ["farmer", "company"],
  },
  {
    title: "Customers",
    items: ["shop"],
  },
  {
    title: "People",
    items: ["salary", "transport"],
  },
];

function AccountsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const isAdmin = useDirectoryAdmin();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);

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
    const cat = searchParams.get("category");
    const create = searchParams.get("create");
    const mode = searchParams.get("mode");
    if (cat === "all") setActiveCategory("all");
    else if (cat && PROJECT_CATEGORIES.includes(cat)) setActiveCategory(cat);
    else if (cat) router.replace("/accounts", { scroll: false });
    if (create === "1" && cat && PROJECT_CATEGORIES.includes(cat)) setModalOpen(true);
  }, [searchParams, router]);

  const updateUrl = (category, create = false) => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (create) params.set("create", "1");
    const qs = params.toString();
    router.replace(qs ? `/accounts?${qs}` : "/accounts", { scroll: false });
  };

  const openCategory = (slug) => {
    setActiveCategory(slug);
    setSearchQuery("");
    updateUrl(slug);
  };

  const backToOverview = () => {
    setActiveCategory(null);
    setSearchQuery("");
    router.replace("/accounts", { scroll: false });
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

  const categoryStats = useMemo(() => {
    return PROJECT_CATEGORIES.map((slug) => ({
      slug,
      name: CATEGORY_LABELS[slug],
      desc: CATEGORY_DESC[slug],
      count: accounts.filter((a) => a.category === slug).length,
      balance: accounts.filter((a) => a.category === slug).reduce((s, a) => s + a.balance, 0),
      icon: CATEGORY_ICONS[slug],
      accent: CATEGORY_ACCENT[slug],
    }));
  }, [accounts]);

  const statsBySlug = useMemo(() => Object.fromEntries(categoryStats.map((c) => [c.slug, c])), [categoryStats]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((a) => {
      const matchesCategory = !activeCategory || activeCategory === "all" ? true : a.category === activeCategory;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        a.name.toLowerCase().includes(q) ||
        (a.code && a.code.toLowerCase().includes(q)) ||
        (a.phone && a.phone.toLowerCase().includes(q)) ||
        (a.party?.name && a.party.name.toLowerCase().includes(q)) ||
        (a.party?.subtitle && a.party.subtitle.toLowerCase().includes(q)) ||
        (a.party?.contactPerson && a.party.contactPerson.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [accounts, activeCategory, searchQuery]);

  const totalReceivable = accounts
    .filter((a) => a.category === "shop" && a.balance > 0)
    .reduce((s, a) => s + a.balance, 0);
  const totalPayable = accounts
    .filter((a) => ["farmer", "company", "salary", "transport"].includes(a.category) && a.balance > 0)
    .reduce((s, a) => s + a.balance, 0);
  const cashBankTotal = accounts
    .filter((a) => a.category === "cash" || a.category === "bank")
    .reduce((s, a) => s + a.balance, 0);

  const columns = useMemo(() => {
    const accountNameCell = (row) => {
      if (row.party?.name) {
        return (
          <div className="min-w-0">
            <p className="font-semibold text-[var(--text-primary)] truncate">{row.party.name}</p>
            {row.party.subtitle && (
              <p className="text-[10px] text-slate-500 truncate mt-0.5">
                {row.party.kind === "company" ? `Contact: ${row.party.subtitle}` : row.party.subtitle}
              </p>
            )}
          </div>
        );
      }
      return <span className="font-semibold text-[var(--text-primary)]">{row.name}</span>;
    };

    const cols = [
      {
        header: "Account name",
        accessor: "name",
        wrap: false,
        cell: (row) => accountNameCell(row),
      },
      {
        header: "Code",
        accessor: "code",
        wrap: false,
        cell: (row) => (
          <span className="text-xs font-mono text-[var(--text-secondary)]">{row.code || "—"}</span>
        ),
      },
    ];

    if (activeCategory === "all" || !activeCategory) {
      cols.push({
        header: "Category",
        accessor: "category",
        wrap: false,
        cell: (row) => (
          <span className="text-xs font-medium text-slate-600">{CATEGORY_LABELS[row.category] || row.category}</span>
        ),
      });
    }

    cols.push(
      {
        header: "Phone",
        accessor: "phone",
        wrap: false,
        cell: (row) => (
          <span className="text-sm text-[var(--text-primary)] tabular-nums">{row.party?.phone || row.phone || "—"}</span>
        ),
      },
      {
        header: "City",
        accessor: "city",
        wrap: false,
        cell: (row) => (
          <span className="text-sm text-[var(--text-secondary)]">{row.party?.city || row.city || "—"}</span>
        ),
      },
      {
        header: "Balance",
        accessor: "balance",
        align: "right",
        wrap: false,
        cell: (row) => (
          <span className={`font-mono text-sm font-bold tabular-nums ${row.balance >= 0 ? "text-[var(--status-success)]" : "text-[var(--status-danger)]"}`}>
            {formatCurrency(row.balance)}
          </span>
        ),
      },
      {
        header: "Status",
        accessor: "isActive",
        align: "center",
        sortable: false,
        wrap: false,
        cell: (row) => (
          <Badge variant={row.isActive ? "success" : "neutral"}>{row.isActive ? "Active" : "Inactive"}</Badge>
        ),
      },
    );

    if (activeCategory) {
      cols.push({
        header: "Actions",
        accessor: "adminActions",
        align: "right",
        sortable: false,
        wrap: false,
        cell: (row) => (
          <DirectoryAdminActions
            onEdit={() => handleEditAccount(row)}
            onDelete={() => handleDeleteAccount(row)}
            onView={() => router.push(`/accounts/${row.id}`)}
          />
        ),
      });
    }

    return cols;
  }, [activeCategory, handleEditAccount, handleDeleteAccount, router]);

  const activeLabel = activeCategory && activeCategory !== "all"
    ? CATEGORY_LABELS[activeCategory]
    : "All Accounts";

  if (loading && accounts.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 page-enter pb-8">
      <PageHeader
        module="accounts"
        title={activeCategory ? activeLabel : "All Accounts"}
        description={
          activeCategory
            ? CATEGORY_DESC[activeCategory] || "Manage accounts in this category."
            : "Register cash, bank, suppliers, customers, staff and drivers — only name and phone required."
        }
        icon={BookOpen}
        breadcrumbs={
          activeCategory
            ? [{ label: "All Accounts", href: "/accounts" }, { label: activeLabel }]
            : []
        }
        actions={
          activeCategory && activeCategory !== "all" && isAdmin ? (
            <Button onClick={openCreateModal} className="bg-acc-accounts border-0">
              <Plus className="w-4 h-4" /> Add Account
            </Button>
          ) : null
        }
      />

      {!activeCategory ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard module="accounts" label="Total Accounts" value={accounts.length} icon={Users} />
            <StatCard module="accounts" label="Cash & Bank" value={formatCurrency(cashBankTotal)} icon={Wallet} valueClassName="text-emerald-700" />
            <StatCard module="accounts" label="Receivables" value={formatCurrency(totalReceivable)} icon={Store} />
            <StatCard module="accounts" label="Payables" value={formatCurrency(totalPayable)} icon={Landmark} valueClassName="text-rose-600" />
          </div>

          {isAdmin && <DirectoryAdminNotice />}

          {CATEGORY_GROUPS.map((group) => (
            <section key={group.title} className="space-y-3">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 px-1">
                {group.title}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {group.items.map((slug) => {
                  const cat = statsBySlug[slug];
                  if (!cat) return null;
                  const Icon = cat.icon;
                  return (
                    <button
                      key={slug}
                      type="button"
                      onClick={() => openCategory(slug)}
                      className={`text-left bg-white rounded-xl border border-slate-200/90 border-t-[3px] ${cat.accent} p-4 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer group`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-900 group-hover:text-acc-accounts transition-colors">
                            {cat.name}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{cat.desc}</p>
                        </div>
                        <div className="shrink-0 w-9 h-9 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
                          <Icon className="w-4 h-4" strokeWidth={2} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Accounts</p>
                          <p className="text-lg font-black text-slate-800 tabular-nums">{cat.count}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Balance</p>
                          <p className="text-sm font-bold font-mono text-slate-700 tabular-nums">
                            {formatCurrency(Math.abs(cat.balance))}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => { setActiveCategory("all"); updateUrl("all"); }}
              className="text-xs font-semibold text-acc-accounts hover:underline cursor-pointer"
            >
              View full account list →
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={backToOverview}
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-acc-accounts cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back to categories
            </button>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, contact, code or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
          </div>

          {activeCategory !== "all" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatCard
                module="accounts"
                label="In this category"
                value={filteredAccounts.length}
                icon={CATEGORY_ICONS[activeCategory] || BookOpen}
              />
              <StatCard
                module="accounts"
                label="Total balance"
                value={formatCurrency(filteredAccounts.reduce((s, a) => s + a.balance, 0))}
                icon={Wallet}
              />
            </div>
          )}

          {isAdmin && activeCategory !== "all" && <DirectoryAdminNotice />}

          <div className="erp-list-card bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="h-48 flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-acc-accounts animate-spin" />
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="py-16 text-center px-4">
                <p className="text-sm text-slate-500 mb-1">No accounts found</p>
                {isAdmin && activeCategory !== "all" && (
                  <>
                    <p className="text-xs text-slate-400 mb-4">Register the first account in this category.</p>
                    <Button onClick={openCreateModal} className="bg-acc-accounts border-0">
                      <Plus className="w-4 h-4" /> New Account
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={filteredAccounts}
                onRowClick={(row) => router.push(`/accounts/${row.id}`)}
              />
            )}
          </div>
        </div>
      )}

      {activeCategory && activeCategory !== "all" && (
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

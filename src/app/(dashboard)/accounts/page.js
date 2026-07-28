"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import Link from "next/link";
import { DataTable } from "@/components/ui/DataTable";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  BookOpen, Loader2, Wallet, Landmark, Users, PieChart, ShoppingCart, ChevronRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { PageHeader, StatCard } from "@/components/layout/PageHeader";

const FINANCE_REPORTS = [
  {
    href: "/reports/profit-loss",
    icon: PieChart,
    title: "Profit & Loss",
    description: "Revenue, COGS, and expenses summary.",
    color: "text-indigo-600 bg-indigo-50 border-indigo-100",
  },
  {
    href: "/reports/purchases",
    icon: ShoppingCart,
    title: "Purchase Report",
    description: "Purchases by vendor, date, and product.",
    color: "text-rose-600 bg-rose-50 border-rose-100",
  },
];

const TYPE_LABELS = { asset: "Asset", liability: "Liability", equity: "Equity", revenue: "Revenue", expense: "Expense" };
const CATEGORY_LABELS = { farmer: "Farmer", company: "Company", shop: "Shop", bank: "Bank", cash: "Cash", transport: "Transport", expense: "Expense", salary: "Salary", general: "General" };

export default function AccountsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("");

  useEffect(() => {
    async function fetchAccounts() {
      setLoading(true);
      try {
        const url = filterCategory ? `/api/accounts?category=${filterCategory}` : "/api/accounts";
        const res = await fetch(url);
        const data = await res.json();
        if (res.ok) setAccounts(data.accounts || []);
        else showToast(data.error || "Failed to load accounts", "error");
      } catch {
        showToast("Error connecting to server", "error");
      } finally {
        setLoading(false);
      }
    }
    fetchAccounts();
  }, [filterCategory, showToast]);

  const totalAssets = accounts.filter((a) => a.type === "asset").reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = accounts.filter((a) => a.type === "liability").reduce((s, a) => s + a.balance, 0);

  const columns = [
    {
      header: "Account",
      accessor: "name",
      cell: (row) => (
        <div>
          <p className="font-semibold">{row.name}</p>
          {row.code && <p className="text-[10px] font-mono text-slate-400">{row.code}</p>}
        </div>
      ),
    },
    {
      header: "Type",
      accessor: "type",
      cell: (row) => <Badge variant={row.type === "asset" ? "success" : row.type === "liability" ? "warning" : "info"}>{TYPE_LABELS[row.type] || row.type}</Badge>,
    },
    {
      header: "Category",
      accessor: "category",
      cell: (row) => <span className="text-xs capitalize">{CATEGORY_LABELS[row.category] || row.category}</span>,
    },
    {
      header: "Balance",
      accessor: "balance",
      cell: (row) => (
        <span className={`font-mono text-xs font-bold ${row.balance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
          {formatCurrency(row.balance)}
        </span>
      ),
    },
    {
      header: "Status",
      accessor: "isActive",
      cell: (row) => <Badge variant={row.isActive ? "success" : "neutral"}>{row.isActive ? "Active" : "Inactive"}</Badge>,
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 page-enter">
      <PageHeader
        module="accounts"
        title="Chart of Accounts"
        description="All ledger accounts and balances. Use the Finance menu for ledger, payments, expenses, and day close."
        icon={BookOpen}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard module="accounts" label="Total Assets" value={formatCurrency(totalAssets)} icon={Wallet} valueClassName="text-emerald-600" />
        <StatCard module="accounts" label="Total Liabilities" value={formatCurrency(totalLiabilities)} icon={Landmark} valueClassName="text-red-600" />
        <StatCard module="accounts" label="Total Accounts" value={accounts.length} icon={Users} />
      </div>

      <div className="flex gap-2 flex-wrap">
        <button type="button" onClick={() => setFilterCategory("")} className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer min-h-[36px] ${!filterCategory ? "bg-teal-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}>All</button>
        {["cash", "bank", "farmer", "company", "shop"].map((cat) => (
          <button key={cat} type="button" onClick={() => setFilterCategory(cat)} className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer min-h-[36px] ${filterCategory === cat ? "bg-teal-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}>{cat}</button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0 sm:p-0">
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={accounts}
              searchKey="name"
              placeholder="Search accounts..."
              onRowClick={(row) => router.push(`/accounts/${row.id}`)}
            />
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Finance reports</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {FINANCE_REPORTS.map((report) => {
            const Icon = report.icon;
            return (
              <Link key={report.href} href={report.href}>
                <Card className="h-full hover:border-teal-200 transition-all hover:shadow-md group">
                  <CardContent className="flex items-start gap-4 p-4 sm:p-5">
                    <div className={`p-3 rounded-xl border shrink-0 ${report.color} group-hover:scale-105 transition-transform`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-slate-900 text-sm">{report.title}</h3>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 shrink-0" />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{report.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

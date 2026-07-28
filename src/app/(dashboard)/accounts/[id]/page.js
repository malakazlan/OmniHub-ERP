"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { PageHeader, StatCard } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DataTable } from "@/components/ui/DataTable";
import {
  BookOpen, Loader2, ArrowLeft, MapPin, Phone, Hash, Wallet,
  ArrowDownCircle, ArrowUpCircle,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

const TYPE_LABELS = { asset: "Asset", liability: "Liability", equity: "Equity", revenue: "Revenue", expense: "Expense" };

export default function AccountLedgerPage() {
  const { id } = useParams();
  const { showToast } = useToast();
  const [account, setAccount] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLedger() {
      try {
        const res = await fetch(`/api/accounts/ledger?accountId=${id}`);
        const data = await res.json();
        if (res.ok) {
          setAccount(data.account);
          setEntries(data.entries || []);
        } else {
          showToast(data.error || "Failed to load ledger", "error");
        }
      } catch {
        showToast("Error connecting to server", "error");
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchLedger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const totalDebit = entries.reduce((s, e) => s + (e.debit || 0), 0);
  const totalCredit = entries.reduce((s, e) => s + (e.credit || 0), 0);

  const columns = [
    { header: "Date", accessor: "date", cell: (row) => <span className="text-xs text-slate-500">{formatDate(row.date)}</span> },
    {
      header: "Description",
      accessor: "description",
      cell: (row) => (
        <div>
          <p className="font-medium text-slate-800 text-sm">{row.description}</p>
          {row.reference && <p className="text-[10px] font-mono text-slate-400">{row.reference}</p>}
        </div>
      ),
    },
    {
      header: "Debit",
      accessor: "debit",
      cell: (row) => row.debit > 0 ? <span className="font-mono text-xs font-bold text-red-500">{formatCurrency(row.debit)}</span> : <span className="text-slate-300">—</span>,
    },
    {
      header: "Credit",
      accessor: "credit",
      cell: (row) => row.credit > 0 ? <span className="font-mono text-xs font-bold text-emerald-600">{formatCurrency(row.credit)}</span> : <span className="text-slate-300">—</span>,
    },
    {
      header: "Balance",
      accessor: "balance",
      cell: (row) => <span className="font-mono text-xs font-bold text-slate-900">{formatCurrency(row.balance)}</span>,
    },
  ];

  if (loading) {
    return (
      <div className="h-72 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-acc-accounts animate-spin" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="space-y-6 page-enter">
        <Link href="/accounts" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-acc-accounts transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Accounts
        </Link>
        <Card><CardContent className="text-center py-14">
          <p className="text-sm font-semibold text-slate-500">Account not found</p>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 page-enter">
      <PageHeader
        module="accounts"
        title={account.name}
        description={`Account ledger · ${account.code || "—"}`}
        icon={BookOpen}
        breadcrumbs={[{ label: "Accounts", href: "/accounts" }, { label: account.name }]}
        actions={<Badge variant={account.type === "asset" ? "success" : account.type === "liability" ? "warning" : "info"}>{TYPE_LABELS[account.type] || account.type}</Badge>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard module="accounts" label="Current Balance" value={formatCurrency(account.balance)} icon={Wallet} />
        <StatCard module="accounts" label="Total Debit" value={formatCurrency(totalDebit)} icon={ArrowDownCircle} valueClassName="text-red-500" />
        <StatCard module="accounts" label="Total Credit" value={formatCurrency(totalCredit)} icon={ArrowUpCircle} valueClassName="text-emerald-600" />
        <StatCard module="accounts" label="Entries" value={entries.length} icon={Hash} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-500">
        {account.city && (
          <div className="flex items-center gap-2 bg-white border border-slate-200/80 rounded-xl px-4 py-3">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" /> {account.city}
          </div>
        )}
        {account.phone && (
          <div className="flex items-center gap-2 bg-white border border-slate-200/80 rounded-xl px-4 py-3">
            <Phone className="w-4 h-4 text-slate-400 shrink-0" /> {account.phone}
          </div>
        )}
      </div>

      <Card>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-14">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-500">No ledger entries yet</p>
              <p className="text-xs text-slate-400 mt-1">Transactions posted to this account will appear here.</p>
            </div>
          ) : (
            <DataTable columns={columns} data={entries} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

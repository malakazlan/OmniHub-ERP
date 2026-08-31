"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { DataTable } from "@/components/ui/DataTable";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/Button";
import { DirectoryRegisterBanner } from "@/components/accounts/DirectoryShell";
import { Store, MapPin, Phone, DollarSign, Loader2, ShoppingBag, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { PageHeader, StatCard } from "@/components/layout/PageHeader";

export default function ShopsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchShops = async () => {
    try {
      const res = await fetch("/api/shops");
      const data = await res.json();
      if (res.ok) setShops(data.shops || []);
      else showToast(data.error || "Failed to load shops", "error");
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchShops(); }, []);

  const totalReceivable = shops.reduce((s, sh) => s + Math.max(sh.balance || 0, 0), 0);

  const columns = [
    {
      header: "Shop",
      accessor: "name",
      cell: (row) => (
        <div>
          <p className="font-semibold">{row.name}</p>
          {row.ownerName && <p className="text-[10px] text-slate-400">Owner: {row.ownerName}</p>}
        </div>
      ),
    },
    {
      header: "Type",
      accessor: "shopType",
      cell: (row) => <Badge variant="info">{row.shopType || "retail"}</Badge>,
    },
    {
      header: "Contact",
      accessor: "phone",
      cell: (row) => row.phone ? (
        <span className="text-xs flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" />{row.phone}</span>
      ) : "—",
    },
    {
      header: "Location",
      accessor: "city",
      cell: (row) => (
        <span className="text-xs flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          {row.area ? `${row.area}, ` : ""}{row.city || "N/A"}
        </span>
      ),
    },
    {
      header: "Dealer",
      accessor: "dealer",
      cell: (row) => row.dealer?.name ? (
        <Link href={`/dealers/${row.dealer.id}`} className="text-xs font-semibold text-violet-600 hover:underline">
          {row.dealer.name}
        </Link>
      ) : <span className="text-xs text-slate-400">—</span>,
    },
    {
      header: "Receivable",
      accessor: "balance",
      cell: (row) => (
        <span className={`font-mono text-xs font-bold ${row.balance > 0 ? "text-red-400" : "text-emerald-400"}`}>
          {formatCurrency(row.balance)}
        </span>
      ),
    },
    {
      header: "Credit Limit",
      accessor: "creditLimit",
      cell: (row) => <span className="font-mono text-xs">{formatCurrency(row.creditLimit)}</span>,
    },
    {
      header: "Status",
      accessor: "isActive",
      cell: (row) => <Badge variant={row.isActive ? "success" : "neutral"}>{row.isActive ? "Active" : "Suspended"}</Badge>,
    },
  ];

  return (
    <div className="space-y-8 page-enter">
      <PageHeader
        module="shops"
        title="Shops"
        description="View customers and receivables. Register new shops in All Accounts."
        icon={Store}
        actions={
          <Link href="/accounts?category=shop&create=1">
            <Button variant="outline" className="border-amber-200 text-acc-shops hover:bg-amber-50">
              <Plus className="w-4 h-4" /> Register in All Accounts
            </Button>
          </Link>
        }
      />

      <DirectoryRegisterBanner category="shop" label="shop / customer" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard module="shops" label="Total Shops" value={shops.length} icon={ShoppingBag} />
        <StatCard module="shops" label="Active" value={shops.filter(s => s.isActive).length} icon={Store} />
        <StatCard module="shops" label="Receivables" value={formatCurrency(totalReceivable)} icon={DollarSign} valueClassName="text-red-400" />
      </div>

      <Card><CardContent>
        {loading ? (
          <div className="h-48 flex items-center justify-center"><Loader2 className="w-8 h-8 text-acc-shops animate-spin" /></div>
        ) : (
          <DataTable columns={columns} data={shops} searchKey="name" placeholder="Search shops..." onRowClick={(row) => router.push(`/shops/${row.id}`)} />
        )}
      </CardContent></Card>
    </div>
  );
}

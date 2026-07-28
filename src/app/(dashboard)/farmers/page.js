"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { PageHeader, StatCard } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/Button";
import { DirectoryRegisterBanner } from "@/components/accounts/DirectoryShell";
import { Sprout, MapPin, Phone, DollarSign, Loader2, UserPlus, FolderTree } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

export default function FarmersPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFarmers = async () => {
    try {
      const res = await fetch("/api/farmers");
      const data = await res.json();
      if (res.ok) setFarmers(data.farmers || []);
      else showToast(data.error || "Failed to load farmers", "error");
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFarmers(); }, []);

  const totalOwed = farmers.reduce((s, f) => s + (f.balance || 0), 0);

  const columns = [
    {
      header: "Name", accessor: "name",
      cell: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.name}</p>
          {row.fatherName && <p className="text-[10px] text-slate-500">S/o: {row.fatherName}</p>}
        </div>
      ),
    },
    {
      header: "Contact", accessor: "phone",
      cell: (row) => (
        <div className="text-xs space-y-0.5">
          {row.phone && <p className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-500" />{row.phone}</p>}
          {row.whatsappNumber && <p className="text-[10px] text-acc-farmers">WA: {row.whatsappNumber}</p>}
        </div>
      ),
    },
    {
      header: "Location", accessor: "city",
      cell: (row) => (
        <span className="text-xs flex items-center gap-1 text-slate-400">
          <MapPin className="w-3.5 h-3.5" />
          {row.village ? `${row.village}, ` : ""}{row.city || "N/A"}
        </span>
      ),
    },
    {
      header: "Payable", accessor: "balance",
      cell: (row) => (
        <span className={`font-mono text-xs font-bold ${row.balance < 0 ? "text-red-400" : row.balance > 0 ? "text-emerald-400" : "text-acc-farmers"}`}>
          {formatCurrency(Math.abs(row.balance))}
          {row.balance > 0 && <span className="ml-1 text-[10px] font-semibold opacity-70">(Credit)</span>}
        </span>
      ),
    },
    {
      header: "Status", accessor: "isActive",
      cell: (row) => <Badge variant={row.isActive ? "success" : "neutral"}>{row.isActive ? "Active" : "Suspended"}</Badge>,
    },
    {
      header: "CNIC", accessor: "cnic",
      cell: (row) => <span className="font-mono text-xs text-slate-400">{row.cnic || "—"}</span>,
    },
  ];

  return (
    <div className="space-y-8 page-enter">
      <PageHeader
        module="farmers"
        title="Farmers"
        description="View suppliers and payables. Register new farmers in Project Accounts."
        icon={Sprout}
        actions={
          <Link href="/accounts/directory/farmers">
            <Button variant="outline" className="border-emerald-200 text-acc-farmers hover:bg-emerald-50">
              <FolderTree className="w-4 h-4" /> Register in Project Accounts
            </Button>
          </Link>
        }
      />

      <DirectoryRegisterBanner href="/accounts/directory/farmers" label="farmer" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard module="farmers" label="Total Farmers" value={farmers.length} icon={UserPlus} />
        <StatCard module="farmers" label="Active Suppliers" value={farmers.filter(f => f.isActive).length} icon={Sprout} />
        <StatCard module="farmers" label="Total Payables" value={formatCurrency(totalOwed)} icon={DollarSign} valueClassName="text-red-400" />
      </div>

      <Card>
        <CardContent>
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-acc-farmers animate-spin" />
            </div>
          ) : (
            <DataTable columns={columns} data={farmers} searchKey="name" placeholder="Search farmers..." onRowClick={(row) => router.push(`/farmers/${row.id}`)} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

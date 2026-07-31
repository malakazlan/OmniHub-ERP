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
import { Building2, MapPin, Phone, DollarSign, Loader2, Factory, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { PageHeader, StatCard } from "@/components/layout/PageHeader";

const COMPANY_TYPE_LABELS = { supplier: "Supplier", buyer: "Buyer", both: "Both" };

export default function CompaniesPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/companies");
      const data = await res.json();
      if (res.ok) setCompanies(data.companies || []);
      else showToast(data.error || "Failed to load companies", "error");
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCompanies(); }, []);

  const totalBalance = companies.reduce((s, c) => s + (c.balance || 0), 0);

  const columns = [
    {
      header: "Company",
      accessor: "name",
      cell: (row) => (
        <div>
          <p className="font-semibold">{row.name}</p>
          {row.contactPerson && <p className="text-[10px] text-slate-400">{row.contactPerson}</p>}
        </div>
      ),
    },
    {
      header: "Type",
      accessor: "companyType",
      cell: (row) => (
        <Badge variant={row.companyType === "both" ? "info" : row.companyType === "supplier" ? "warning" : "success"}>
          {COMPANY_TYPE_LABELS[row.companyType] || row.companyType}
        </Badge>
      ),
    },
    {
      header: "Contact",
      accessor: "phone",
      cell: (row) => (
        <div className="text-xs">
          {row.phone && <p className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" />{row.phone}</p>}
          {row.email && <p className="text-slate-400">{row.email}</p>}
        </div>
      ),
    },
    {
      header: "City",
      accessor: "city",
      cell: (row) => (
        <span className="text-xs flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />{row.city || "N/A"}
        </span>
      ),
    },
    {
      header: "Balance",
      accessor: "balance",
      cell: (row) => (
        <span className={`font-mono text-xs font-bold ${row.balance > 0 ? "text-amber-400" : "text-emerald-400"}`}>
          {formatCurrency(row.balance)}
        </span>
      ),
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
        module="companies"
        title="Companies"
        description="View suppliers and buyers. Register new companies in All Accounts."
        icon={Building2}
        actions={
          <Link href="/accounts?category=company&create=1">
            <Button variant="outline" className="border-blue-200 text-acc-companies hover:bg-blue-50">
              <Plus className="w-4 h-4" /> Register in All Accounts
            </Button>
          </Link>
        }
      />

      <DirectoryRegisterBanner category="company" label="company" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard module="companies" label="Total Companies" value={companies.length} icon={Factory} />
        <StatCard module="companies" label="Active" value={companies.filter(c => c.isActive).length} icon={Building2} />
        <StatCard module="companies" label="Net Balance" value={formatCurrency(totalBalance)} icon={DollarSign} />
      </div>

      <Card><CardContent>
        {loading ? (
          <div className="h-48 flex items-center justify-center"><Loader2 className="w-8 h-8 text-acc-companies animate-spin" /></div>
        ) : (
          <DataTable columns={columns} data={companies} searchKey="name" placeholder="Search companies..." onRowClick={(row) => router.push(`/companies/${row.id}`)} />
        )}
      </CardContent></Card>
    </div>
  );
}

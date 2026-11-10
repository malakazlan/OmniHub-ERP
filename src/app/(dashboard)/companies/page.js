"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { DataTable } from "@/components/ui/DataTable";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/Button";
import { DirectoryRegisterBanner } from "@/components/accounts/DirectoryShell";
import { Building2, MapPin, Phone, DollarSign, Loader2, Factory, Plus, Users, Truck } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { COMPANY_TYPE_LABELS } from "@/lib/constants";
import { PageHeader, StatCard } from "@/components/layout/PageHeader";

/**
 * Directory views over Company records.
 *   /companies?type=customers → companyType buyer | both
 *   /companies?type=vendors   → companyType supplier | both
 *   /companies                → everyone
 */
const VIEWS = {
  all: {
    key: "all",
    title: "Customers & Vendors",
    singular: "customer or vendor",
    plural: "customers and vendors",
    description: "Every trading partner on file. Register new accounts in Chart of Accounts.",
    icon: Building2,
    totalLabel: "Total Partners",
    match: () => true,
  },
  customers: {
    key: "customers",
    title: "Customers",
    singular: "customer",
    plural: "customers",
    description: "Accounts you invoice. Register new customers in Chart of Accounts.",
    icon: Users,
    totalLabel: "Total Customers",
    match: (type) => type === "buyer" || type === "both",
  },
  vendors: {
    key: "vendors",
    title: "Vendors",
    singular: "vendor",
    plural: "vendors",
    description: "Accounts that bill you. Register new vendors in Chart of Accounts.",
    icon: Truck,
    totalLabel: "Total Vendors",
    match: (type) => type === "supplier" || type === "both",
  },
};

function resolveView(param) {
  if (param === "customers" || param === "customer" || param === "buyer") return VIEWS.customers;
  if (param === "vendors" || param === "vendor" || param === "supplier") return VIEWS.vendors;
  return VIEWS.all;
}

function typeBadgeVariant(type) {
  if (type === "both") return "info";
  if (type === "supplier") return "warning";
  return "success";
}

function CompaniesDirectory() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  const view = resolveView(searchParams.get("type"));

  useEffect(() => {
    let cancelled = false;
    fetch("/api/companies")
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) setCompanies(data.companies || []);
        else showToast(data.error || "Failed to load customers and vendors", "error");
      })
      .catch(() => {
        if (!cancelled) showToast("Error connecting to server", "error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const rows = useMemo(
    () => companies.filter((c) => view.match(c.companyType)),
    [companies, view]
  );

  const totalBalance = rows.reduce((s, c) => s + (c.balance || 0), 0);
  const Icon = view.icon;

  const columns = [
    {
      header: "Name",
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
        <Badge variant={typeBadgeVariant(row.companyType)}>
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
        title={view.title}
        description={view.description}
        icon={Icon}
        actions={
          <Link href="/accounts?category=company&create=1">
            <Button variant="outline" className="border-blue-200 text-acc-companies hover:bg-blue-50">
              <Plus className="w-4 h-4" /> Register in Chart of Accounts
            </Button>
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2">
        {Object.values(VIEWS).map((v) => {
          const active = v.key === view.key;
          const href = v.key === "all" ? "/companies" : `/companies?type=${v.key}`;
          return (
            <Link
              key={v.key}
              href={href}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                active
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              {v.title}
            </Link>
          );
        })}
      </div>

      <DirectoryRegisterBanner category="company" label={view.singular} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard module="companies" label={view.totalLabel} value={rows.length} icon={Factory} />
        <StatCard module="companies" label="Active" value={rows.filter((c) => c.isActive).length} icon={Building2} />
        <StatCard module="companies" label="Net Balance" value={formatCurrency(totalBalance)} icon={DollarSign} />
      </div>

      <Card><CardContent>
        {loading ? (
          <div className="h-48 flex items-center justify-center"><Loader2 className="w-8 h-8 text-acc-companies animate-spin" /></div>
        ) : (
          <DataTable
            columns={columns}
            data={rows}
            searchKey="name"
            placeholder={`Search ${view.plural}...`}
            onRowClick={(row) => router.push(`/companies/${row.id}`)}
          />
        )}
      </CardContent></Card>
    </div>
  );
}

export default function CompaniesPage() {
  return (
    <Suspense
      fallback={
        <div className="h-96 flex items-center justify-center page-enter">
          <Loader2 className="w-8 h-8 text-acc-companies animate-spin" />
        </div>
      }
    >
      <CompaniesDirectory />
    </Suspense>
  );
}

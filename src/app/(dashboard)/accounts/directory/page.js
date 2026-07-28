"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import {
  Users, Sprout, Building2, Store, UserCircle, Car,
  ChevronRight, BookOpen, Wallet, Landmark,
} from "lucide-react";
import { DirectoryAdminNotice } from "@/components/accounts/DirectoryAdminActions";

const SECTIONS = [
  {
    title: "Cash & bank",
    items: [
      {
        href: "/accounts/directory/cash",
        icon: Wallet,
        title: "Cash Accounts",
        description: "Petty cash tills — assign to admin or staff; employees get one automatically.",
        color: "text-acc-accounts bg-sky-50 border-sky-100",
      },
      {
        href: "/accounts/directory/bank",
        icon: Landmark,
        title: "Bank Accounts",
        description: "Bank ledger accounts for transfers, purchases, sales, and expenses.",
        color: "text-acc-accounts bg-indigo-50 border-indigo-100",
      },
    ],
  },
  {
    title: "Purchase side (suppliers)",
    items: [
      {
        href: "/accounts/directory/farmers",
        icon: Sprout,
        title: "Farmers",
        description: "Raw material suppliers — ledger payable account created automatically.",
        color: "text-acc-farmers bg-emerald-50 border-emerald-100",
      },
      {
        href: "/accounts/directory/companies",
        icon: Building2,
        title: "Companies",
        description: "Suppliers, buyers, or both — for purchase & sale on company terms.",
        color: "text-acc-companies bg-blue-50 border-blue-100",
      },
    ],
  },
  {
    title: "Sales side (customers)",
    items: [
      {
        href: "/accounts/directory/shops",
        icon: Store,
        title: "Shops / Customers",
        description: "Retail & wholesale customers — receivable ledger account.",
        color: "text-acc-shops bg-amber-50 border-amber-100",
      },
    ],
  },
  {
    title: "People & fleet",
    items: [
      {
        href: "/accounts/directory/employees",
        icon: Users,
        title: "Employees",
        description: "Staff with salary ledger accounts for payroll.",
        color: "text-acc-hr bg-pink-50 border-pink-100",
      },
      {
        href: "/accounts/directory/drivers",
        icon: UserCircle,
        title: "Drivers",
        description: "Transport drivers — employee record + transport ledger where needed.",
        color: "text-acc-transport bg-cyan-50 border-cyan-100",
      },
      {
        href: "/accounts/directory/vehicles",
        icon: Car,
        title: "Vehicles",
        description: "Fleet registration, capacity, and assigned driver details.",
        color: "text-acc-transport bg-slate-50 border-slate-200",
      },
    ],
  },
];

export default function ProjectAccountsHubPage() {
  return (
    <div className="space-y-8 page-enter">
      <PageHeader
        module="accounts"
        title="Project Accounts"
        description="Create and manage all party accounts in one place. Purchases, sales, HR, and transport only select existing accounts — they do not create new ones here."
        icon={BookOpen}
        breadcrumbs={[
          { label: "Accounting", href: "/accounts" },
          { label: "Project Accounts" },
        ]}
      />

      <DirectoryAdminNotice />

      <div className="rounded-xl border border-sky-100 bg-sky-50/80 px-4 py-3 text-xs text-slate-600">
        <strong className="text-slate-800">Single source of truth:</strong> Register farmers, companies, shops, employees, drivers, and vehicles here.
        Each registration creates the linked chart-of-accounts entry for the ledger. Use{" "}
        <Link href="/accounts/ledger" className="text-acc-accounts font-semibold hover:underline">General Ledger</Link>{" "}
        for balances and payments.
      </div>

      {SECTIONS.map((section) => (
        <div key={section.title} className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">{section.title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <Card className="h-full hover:border-slate-300 transition-all hover:shadow-md group">
                    <CardContent className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl border ${item.color} group-hover:scale-105 transition-transform`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-bold text-slate-900 text-sm">{item.title}</h3>
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 shrink-0" />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-3 text-xs">
        <span className="text-slate-500">Quick links (view & transactions only):</span>
        <Link href="/farmers" className="text-acc-farmers font-semibold hover:underline">Farmers</Link>
        <Link href="/companies" className="text-acc-companies font-semibold hover:underline">Companies</Link>
        <Link href="/shops" className="text-acc-shops font-semibold hover:underline">Shops</Link>
        <Link href="/hr" className="text-acc-hr font-semibold hover:underline">HR</Link>
        <Link href="/transport/vehicles" className="text-acc-transport font-semibold hover:underline">Vehicles</Link>
      </div>
    </div>
  );
}

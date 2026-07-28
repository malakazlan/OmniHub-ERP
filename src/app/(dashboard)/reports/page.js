"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import {
  BarChart3, TrendingUp, ShoppingCart, Package, Truck, PieChart,
} from "lucide-react";

const REPORTS = [
  { href: "/reports/sales", title: "Sales Report", desc: "By date, customer, product, salesperson", icon: TrendingUp, module: "sales", color: "text-acc-sales bg-green-50 border-green-100" },
  { href: "/reports/orders", title: "Order Report", desc: "Pending, accepted, converted pipeline", icon: BarChart3, module: "orders", color: "text-orange-700 bg-orange-50 border-orange-100" },
  { href: "/reports/purchases", title: "Purchase Report", desc: "By date, vendor, product", icon: ShoppingCart, module: "purchases", color: "text-acc-purchases bg-red-50 border-red-100" },
  { href: "/reports/inventory", title: "Inventory Report", desc: "Stock levels and movements", icon: Package, module: "products", color: "text-acc-products bg-violet-50 border-violet-100" },
  { href: "/reports/profit-loss", title: "Profit & Loss", desc: "Revenue − COGS − expenses", icon: PieChart, module: "accounts", color: "text-acc-accounts bg-indigo-50 border-indigo-100" },
  { href: "/reports/transport", title: "Transport Report", desc: "Delivery costs and utilization", icon: Truck, module: "transport", color: "text-acc-transport bg-cyan-50 border-cyan-100" },
];

export default function ReportsPage() {
  return (
    <div className="space-y-8 page-enter">
      <PageHeader
        module="reports"
        title="Reports & Analytics"
        description="Business intelligence across sales, purchases, inventory, and logistics."
        icon={BarChart3}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          return (
            <Link key={r.href} href={r.href}>
              <Card className="hover:border-slate-300 transition-all hover:shadow-md h-full">
                <CardContent className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl border ${r.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{r.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">{r.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

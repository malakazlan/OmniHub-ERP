"use client";

import Link from "next/link";
import {
  BarChart3, TrendingUp, ShoppingCart, Package, Truck, PieChart,
  CalendarCheck, Wallet2, CreditCard, Scale, Users, Banknote, Building2,
} from "lucide-react";

const SECTIONS = [
  {
    title: "Sales & Operations",
    reports: [
      { href: "/reports/sales", title: "Sales Report", desc: "Invoices, revenue, collections & outstanding", icon: TrendingUp, color: "is-sales" },
      { href: "/reports/purchases", title: "Purchase Report", desc: "Vendor bills, spend & payables", icon: ShoppingCart, color: "is-purchases" },
      { href: "/reports/orders", title: "Order Pipeline", desc: "Pending, accepted & converted orders", icon: BarChart3, color: "is-orders" },
      { href: "/reports/inventory", title: "Inventory Report", desc: "Stock levels, valuation & low-stock alerts", icon: Package, color: "is-products" },
    ],
  },
  {
    title: "Finance & Accounts",
    reports: [
      { href: "/reports/profit-loss", title: "Profit & Loss", desc: "Revenue, COGS, expenses & net profit", icon: PieChart, color: "is-accounts" },
      { href: "/reports/receivables", title: "Receivables & Payables", desc: "Customer dues and vendor balances", icon: Scale, color: "is-accounts" },
      { href: "/reports/expenses", title: "Expense Report", desc: "Operating expenses by category", icon: Wallet2, color: "is-accounts" },
      { href: "/reports/payments", title: "Payment Register", desc: "All payments by method and date", icon: CreditCard, color: "is-accounts" },
      { href: "/reports/cash-bank?category=cash", title: "Cash Report", desc: "Cash account balances, receipts & payments", icon: Banknote, color: "is-accounts" },
      { href: "/reports/cash-bank?category=bank", title: "Bank Report", desc: "Bank account ledger and movements", icon: Building2, color: "is-accounts" },
    ],
  },
  {
    title: "HR & Logistics",
    reports: [
      { href: "/reports/attendance", title: "Attendance Report", desc: "Monthly presence, absence & attendance rate", icon: CalendarCheck, color: "is-hr" },
      { href: "/hr/salary", title: "Salary Register", desc: "Payroll processing & salary slips", icon: Users, color: "is-hr" },
      { href: "/reports/transport", title: "Transport Report", desc: "Trips, freight costs & fleet utilization", icon: Truck, color: "is-transport" },
    ],
  },
];

export default function ReportsPage() {
  return (
    <div className="erp-reports-surface page-enter pb-10">
      <div className="erp-reports-page space-y-6">
        <header className="erp-reports-page-header">
          <div>
            <div className="erp-reports-page-badge">
              <BarChart3 className="w-3.5 h-3.5" />
              Business intelligence
            </div>
            <h1 className="erp-reports-page-title">Reports & analytics</h1>
            <p className="erp-reports-page-desc">
              Operational registers, financial statements, HR summaries, and logistics — all with print and PDF export.
            </p>
          </div>
        </header>

        {SECTIONS.map((section) => (
          <section key={section.title} className="erp-reports-hub-section">
            <h2 className="erp-reports-hub-section-title">{section.title}</h2>
            <div className="erp-reports-hub-grid">
              {section.reports.map((r) => {
                const Icon = r.icon;
                return (
                  <Link key={r.href} href={r.href} className={`erp-reports-hub-card ${r.color}`}>
                    <div className="erp-reports-hub-card-icon">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="erp-reports-hub-card-title">{r.title}</h3>
                      <p className="erp-reports-hub-card-desc">{r.desc}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

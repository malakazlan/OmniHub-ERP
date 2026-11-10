"use client";

import Link from "next/link";
import {
  ArrowRight, BarChart3, BookOpen, Package, ShoppingCart, Truck, Users, Wallet,
} from "lucide-react";

const PILLARS = [
  { icon: ShoppingCart, title: "Sales & purchasing", text: "Invoices, orders, vendor bills and returns with ledger postings on save." },
  { icon: BookOpen, title: "General ledger", text: "Double-entry accounts, payments, transfers and journals in one register." },
  { icon: Package, title: "Inventory", text: "Stock levels, valuation and movement reports across every product." },
  { icon: Truck, title: "Fleet & logistics", text: "Vehicles, trips and freight settlements tied back to the books." },
  { icon: Users, title: "People", text: "Employees, attendance and payroll slips without leaving the workspace." },
  { icon: BarChart3, title: "Reports", text: "Receivables, payables, cash and profit views that stay current." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col">
      <header className="h-14 px-4 sm:px-8 flex items-center justify-between max-w-[1080px] w-full mx-auto">
        <div className="flex items-center gap-2.5">
          <span className="oh-brand-mark" aria-hidden />
          <span className="leading-tight">
            <span className="oh-brand-name block">Omni Hub</span>
            <span className="oh-brand-sub">Operations &amp; Finance</span>
          </span>
        </div>
        <Link href="/login" className="btn btn-primary">
          Sign in
          <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
        </Link>
      </header>

      <main className="flex-1 w-full max-w-[1080px] mx-auto px-4 sm:px-8 pb-16">
        <section className="pt-14 sm:pt-20 pb-12 max-w-[640px]">
          <span className="oh-pill info no-dot mb-4">Operations &amp; Finance</span>
          <h1 className="text-[32px] sm:text-[40px] font-bold tracking-[-0.02em] leading-[1.1] text-[var(--ink)]">
            One calm workspace for sales, purchasing, inventory and the books.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--ink-2)]">
            Omni Hub keeps day-to-day trading and the general ledger in step. Record a sale, a bill or a
            payment once and every register, balance and report updates with it.
          </p>
          <div className="mt-7 flex items-center gap-3">
            <Link href="/login" className="btn btn-primary !h-10 !px-5 text-sm">
              Sign in to Omni Hub
              <ArrowRight className="w-4 h-4" strokeWidth={2} />
            </Link>
          </div>
        </section>

        <section className="oh-card overflow-hidden">
          <div className="oh-card-hd">
            <h2 className="oh-card-title">What runs inside</h2>
            <span className="oh-card-sub">Every module posts to one ledger</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="p-5 border-b border-[var(--line)] sm:[&:nth-child(2n)]:border-l lg:[&:nth-child(2n)]:border-l-0 lg:[&:nth-child(3n+2)]:border-l lg:[&:nth-child(3n)]:border-l">
                <div className="w-9 h-9 rounded-[10px] bg-[var(--brand-soft)] text-[var(--brand)] flex items-center justify-center mb-3">
                  <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
                </div>
                <h3 className="text-[14px] font-bold text-[var(--ink)]">{title}</h3>
                <p className="mt-1 text-[13px] text-[var(--ink-3)] leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Ledger-first", value: "Every document posts", note: "Dr / Cr on save" },
            { label: "Numbers that align", value: "Tabular figures", note: "Manrope · IBM Plex Mono" },
            { label: "Works everywhere", value: "Desktop & mobile", note: "Light and dark themes" },
          ].map((item) => (
            <div key={item.label} className="oh-kpi plain !min-h-0">
              <div className="oh-kpi-ic !static !w-9 !h-9 !rounded-[9px] mb-3">
                <Wallet className="w-4 h-4" strokeWidth={1.75} />
              </div>
              <div className="oh-kpi-l">{item.label}</div>
              <div className="text-[16px] font-bold mt-0.5">{item.value}</div>
              <div className="oh-kpi-d">{item.note}</div>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-[var(--line)] bg-[var(--surface)]">
        <div className="max-w-[1080px] mx-auto px-4 sm:px-8 h-12 flex items-center justify-between text-[12px] text-[var(--ink-3)]">
          <span>Omni Hub · Operations &amp; Finance</span>
          <Link href="/login" className="hover:text-[var(--ink)] transition-colors">Sign in</Link>
        </div>
      </footer>
    </div>
  );
}

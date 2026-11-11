import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, BarChart3, BookOpen, Package, ShoppingCart, Truck, Users, ShieldCheck, Zap, Database,
} from "lucide-react";

export const metadata = {
  title: "Omni Hub — Operations & Finance for Distributors",
  description:
    "Customers, vendors, inventory, orders, invoicing, payments, a double-entry ledger, fleet, payroll and reporting in one system.",
};

const MODULES = [
  { icon: ShoppingCart, title: "Sales & Purchasing", text: "Sales orders, invoices, purchase orders, bills and returns. Every document posts to the ledger on save." },
  { icon: Package, title: "Inventory", text: "Live stock by item, movement history, low-stock alerts and valuation. Stock changes only through documents." },
  { icon: BookOpen, title: "General Ledger", text: "Chart of accounts, payments with FIFO settlement, expenses, journals, transfers and a daily close." },
  { icon: Truck, title: "Fleet & Deliveries", text: "Vehicles, routes, freight charges, driver payments and running costs per truck." },
  { icon: Users, title: "Employees & Payroll", text: "Attendance, payroll runs, advances, commissions and printable pay stubs." },
  { icon: BarChart3, title: "Reporting", text: "Profit and loss, receivables and payables, cash and bank, inventory and delivery reports with export." },
];

const PROOF = [
  { icon: ShieldCheck, title: "Built for accountability", text: "Role-based access, server-side permission checks and an audit trail on every change." },
  { icon: Database, title: "One source of truth", text: "Operations and finance share one ledger, so balances and reports never drift from reality." },
  { icon: Zap, title: "Fast on real hardware", text: "Runs on a single server with MySQL. Pages load in milliseconds, not seconds." },
];

/** Hero illustration: an abstract operations board drawn with the product's own palette. */
function HeroIllustration() {
  return (
    <svg viewBox="0 0 640 460" className="w-full h-auto" role="img" aria-label="Illustration of the Omni Hub workspace">
      <defs>
        <linearGradient id="navy" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#213A7F" />
          <stop offset="1" stopColor="#2F6FED" />
        </linearGradient>
        <linearGradient id="cyan" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2CC4D4" />
          <stop offset="1" stopColor="#3D7BF0" />
        </linearGradient>
        <filter id="shadow" x="-10%" y="-10%" width="130%" height="140%">
          <feDropShadow dx="0" dy="14" stdDeviation="14" floodColor="#213A7F" floodOpacity="0.14" />
        </filter>
      </defs>

      {/* backdrop */}
      <rect x="40" y="60" width="560" height="340" rx="18" fill="#FFFFFF" filter="url(#shadow)" />
      <rect x="40" y="60" width="560" height="44" rx="18" fill="#F7F9FD" />
      <rect x="40" y="86" width="560" height="18" fill="#F7F9FD" />
      <circle cx="64" cy="82" r="5" fill="#E6EAF2" />
      <circle cx="80" cy="82" r="5" fill="#E6EAF2" />
      <circle cx="96" cy="82" r="5" fill="#E6EAF2" />
      <rect x="240" y="74" width="160" height="16" rx="8" fill="#EEF2F9" />

      {/* sidebar */}
      <rect x="40" y="104" width="120" height="296" fill="#FBFCFE" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <g key={i}>
          <rect x="58" y={128 + i * 34} width="16" height="16" rx="5" fill={i === 1 ? "#2F6FED" : "#EEF2F9"} />
          <rect x="82" y={132 + i * 34} width={i === 1 ? 52 : 44} height="8" rx="4" fill={i === 1 ? "#2F6FED" : "#E6EAF2"} />
        </g>
      ))}

      {/* KPI cards */}
      <rect x="184" y="124" width="124" height="74" rx="12" fill="url(#navy)" />
      <rect x="320" y="124" width="124" height="74" rx="12" fill="#3D7BF0" />
      <rect x="456" y="124" width="124" height="74" rx="12" fill="url(#cyan)" />
      {[184, 320, 456].map((x) => (
        <g key={x}>
          <rect x={x + 14} y="138" width="22" height="22" rx="6" fill="#FFFFFF" fillOpacity="0.2" />
          <rect x={x + 44} y="140" width="48" height="7" rx="3.5" fill="#FFFFFF" fillOpacity="0.7" />
          <rect x={x + 44} y="154" width="68" height="12" rx="4" fill="#FFFFFF" />
          <rect x={x + 44} y="174" width="40" height="6" rx="3" fill="#FFFFFF" fillOpacity="0.5" />
        </g>
      ))}

      {/* chart card */}
      <rect x="184" y="214" width="252" height="166" rx="12" fill="#FFFFFF" stroke="#E6EAF2" />
      <rect x="200" y="228" width="90" height="9" rx="4" fill="#1E2433" fillOpacity="0.85" />
      <rect x="200" y="244" width="60" height="6" rx="3" fill="#E6EAF2" />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
        const h = [46, 62, 38, 74, 58, 90, 70, 104, 84][i];
        const x = 204 + i * 25;
        return (
          <g key={i}>
            <rect x={x} y={364 - h} width="9" height={h} rx="3" fill="#2F6FED" />
            <rect x={x + 11} y={364 - h * 0.6} width="9" height={h * 0.6} rx="3" fill="#2CC4D4" fillOpacity="0.85" />
          </g>
        );
      })}
      <line x1="200" y1="364" x2="420" y2="364" stroke="#E6EAF2" />

      {/* register card */}
      <rect x="452" y="214" width="128" height="166" rx="12" fill="#FFFFFF" stroke="#E6EAF2" />
      <rect x="466" y="228" width="70" height="9" rx="4" fill="#1E2433" fillOpacity="0.85" />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <rect x="466" y={252 + i * 24} width="54" height="7" rx="3.5" fill="#E6EAF2" />
          <rect x="534" y={250 + i * 24} width="32" height="11" rx="5.5" fill={["#E5F6EE", "#E5F6EE", "#FFF4DF", "#E5F6EE", "#FDECEB"][i]} />
          <circle cx="541" cy={255.5 + i * 24} r="2.5" fill={["#1B9E63", "#1B9E63", "#D98C00", "#1B9E63", "#E0443A"][i]} />
        </g>
      ))}

      {/* floating truck card */}
      <g filter="url(#shadow)">
        <rect x="488" y="34" width="132" height="58" rx="12" fill="#FFFFFF" />
        <rect x="502" y="48" width="30" height="20" rx="4" fill="#2F6FED" />
        <rect x="532" y="54" width="14" height="14" rx="3" fill="#213A7F" />
        <circle cx="510" cy="72" r="4" fill="#213A7F" />
        <circle cx="540" cy="72" r="4" fill="#213A7F" />
        <rect x="556" y="48" width="50" height="7" rx="3.5" fill="#1E2433" fillOpacity="0.85" />
        <rect x="556" y="61" width="36" height="6" rx="3" fill="#E6EAF2" />
        <rect x="556" y="73" width="44" height="10" rx="5" fill="#E5F6EE" />
      </g>

      {/* floating invoice card */}
      <g filter="url(#shadow)">
        <rect x="12" y="300" width="150" height="112" rx="12" fill="#FFFFFF" />
        <rect x="26" y="314" width="60" height="8" rx="4" fill="#1E2433" fillOpacity="0.85" />
        <rect x="118" y="312" width="32" height="12" rx="6" fill="#E8EFFD" />
        <rect x="26" y="334" width="120" height="6" rx="3" fill="#E6EAF2" />
        <rect x="26" y="348" width="104" height="6" rx="3" fill="#E6EAF2" />
        <rect x="26" y="362" width="112" height="6" rx="3" fill="#E6EAF2" />
        <rect x="26" y="384" width="56" height="8" rx="4" fill="#8A94A6" />
        <rect x="98" y="382" width="48" height="12" rx="4" fill="#2F6FED" />
      </g>
    </svg>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col">
      <header className="h-16 px-4 sm:px-8 flex items-center justify-between max-w-[1180px] w-full mx-auto">
        <div className="flex items-center gap-2.5">
          <span className="oh-brand-mark" aria-hidden />
          <span className="leading-tight">
            <span className="oh-brand-name block">Omni Hub</span>
            <span className="oh-brand-sub">Operations &amp; Finance</span>
          </span>
        </div>
        <nav className="hidden sm:flex items-center gap-6 text-[13.5px] text-[var(--ink-2)]">
          <a href="#modules" className="hover:text-[var(--ink)]">Modules</a>
          <a href="#why" className="hover:text-[var(--ink)]">Why Omni Hub</a>
          <a href="#preview" className="hover:text-[var(--ink)]">Preview</a>
        </nav>
        <Link href="/login" className="btn btn-primary">
          Sign in
          <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
        </Link>
      </header>

      <main className="flex-1 w-full">
        {/* Hero */}
        <section className="max-w-[1180px] mx-auto px-4 sm:px-8 pt-10 sm:pt-16 pb-14 grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-14 items-center">
          <div>
            <span className="oh-pill info no-dot mb-5">For wholesale distributors</span>
            <h1 className="text-[34px] sm:text-[46px] font-bold tracking-[-0.025em] leading-[1.08] text-[var(--ink)]">
              Run operations and the books from one system.
            </h1>
            <p className="mt-5 text-[16px] leading-relaxed text-[var(--ink-2)] max-w-[520px]">
              Omni Hub connects customers, vendors, inventory, deliveries and payroll to a double-entry
              ledger. Record a sale, a bill or a payment once; every balance and report updates with it.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/login" className="btn btn-primary !h-11 !px-6 text-[14px]">
                Sign in to Omni Hub
                <ArrowRight className="w-4 h-4" strokeWidth={2} />
              </Link>
              <a href="#modules" className="btn !h-11 !px-6 text-[14px]">See the modules</a>
            </div>
            <dl className="mt-10 grid grid-cols-3 gap-6 max-w-[460px]">
              <div>
                <dt className="text-[12px] text-[var(--ink-3)]">Modules</dt>
                <dd className="text-[22px] font-bold tracking-[-0.02em] num">8</dd>
              </div>
              <div>
                <dt className="text-[12px] text-[var(--ink-3)]">Ledger accounts</dt>
                <dd className="text-[22px] font-bold tracking-[-0.02em]">Unlimited</dd>
              </div>
              <div>
                <dt className="text-[12px] text-[var(--ink-3)]">Reports</dt>
                <dd className="text-[22px] font-bold tracking-[-0.02em] num">12</dd>
              </div>
            </dl>
          </div>
          <div className="relative">
            <div className="absolute -inset-6 rounded-[32px] bg-[radial-gradient(60%_60%_at_60%_40%,rgba(47,111,237,0.12),transparent_70%)]" aria-hidden />
            <div className="relative">
              <HeroIllustration />
            </div>
          </div>
        </section>

        {/* Proof strip */}
        <section id="why" className="border-y border-[var(--line)] bg-[var(--surface)]">
          <div className="max-w-[1180px] mx-auto px-4 sm:px-8 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
            {PROOF.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-4">
                <div className="w-10 h-10 shrink-0 rounded-[10px] bg-[var(--brand-soft)] text-[var(--brand)] flex items-center justify-center">
                  <Icon className="w-5 h-5" strokeWidth={1.9} />
                </div>
                <div>
                  <h3 className="text-[14.5px] font-semibold">{title}</h3>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-[var(--ink-2)]">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Modules */}
        <section id="modules" className="max-w-[1180px] mx-auto px-4 sm:px-8 py-16">
          <div className="max-w-[560px]">
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-3)]">Modules</span>
            <h2 className="mt-2 text-[28px] font-bold tracking-[-0.02em]">Everything a distributor runs, connected</h2>
            <p className="mt-3 text-[15px] text-[var(--ink-2)] leading-relaxed">
              Each module is a full register with filters, totals, print and export. Behind every one of them sits the same ledger.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MODULES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="oh-card p-6">
                <div className="w-10 h-10 rounded-[10px] bg-[var(--brand-soft)] text-[var(--brand)] flex items-center justify-center">
                  <Icon className="w-5 h-5" strokeWidth={1.9} />
                </div>
                <h3 className="mt-4 text-[15px] font-semibold">{title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--ink-2)]">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Preview */}
        <section id="preview" className="bg-[var(--surface)] border-t border-[var(--line)]">
          <div className="max-w-[1180px] mx-auto px-4 sm:px-8 py-16">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div className="max-w-[560px]">
                <span className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-3)]">Preview</span>
                <h2 className="mt-2 text-[28px] font-bold tracking-[-0.02em]">A dashboard that reads like a balance sheet</h2>
                <p className="mt-3 text-[15px] text-[var(--ink-2)] leading-relaxed">
                  Sales, purchases, receivables, payables and cash in one view, with stock alerts and the ledger one click away.
                </p>
              </div>
              <Link href="/login" className="btn btn-primary !h-11 !px-6 text-[14px] self-start lg:self-auto">
                Open the workspace
                <ArrowRight className="w-4 h-4" strokeWidth={2} />
              </Link>
            </div>
            <div className="mt-10 oh-card overflow-hidden p-2 sm:p-3">
              <Image
                src="/landing/dashboard.jpg"
                alt="Omni Hub dashboard showing sales, purchases, receivables and payables"
                width={1536}
                height={682}
                className="w-full h-auto rounded-[8px]"
                priority
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--line)]">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between text-[12.5px] text-[var(--ink-3)]">
          <span>© {new Date().getFullYear()} Omni Hub</span>
          <div className="flex items-center gap-5">
            <a href="#modules" className="hover:text-[var(--ink)]">Modules</a>
            <Link href="/login" className="hover:text-[var(--ink)]">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

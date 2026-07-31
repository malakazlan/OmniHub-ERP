import {
  LayoutDashboard, Sprout, Building2, Store, Package,
  ShoppingCart, DollarSign, Truck, BookOpen, Users,
  BarChart3, Settings, Receipt, Wallet2, BookText, CalendarCheck,
} from "lucide-react";

export const NAV_SECTIONS = [
  {
    title: "Overview",
    items: [
      { slug: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, keywords: "home overview stats" },
    ],
  },
  {
    title: "Trading Network",
    items: [
      { slug: "farmers", label: "Farmers", href: "/farmers", icon: Sprout, keywords: "suppliers raw material" },
      { slug: "companies", label: "Companies", href: "/companies", icon: Building2, keywords: "suppliers buyers" },
      { slug: "shops", label: "Shops", href: "/shops", icon: Store, keywords: "customers retail wholesale" },
    ],
  },
  {
    title: "Inventory",
    items: [
      { slug: "products", label: "Products", href: "/products", icon: Package, keywords: "stock feed inventory" },
    ],
  },
  {
    title: "Transactions",
    items: [
      { slug: "purchases", label: "Purchases", href: "/purchases", icon: ShoppingCart, keywords: "buy procurement" },
      { slug: "sales", label: "Sales", href: "/sales", icon: DollarSign, keywords: "sell invoices" },
      { slug: "orders", label: "Orders", href: "/orders", icon: Receipt, keywords: "customer orders quotes" },
      { slug: "transport", label: "Transport", href: "/transport", icon: Truck, keywords: "delivery fleet logistics" },
    ],
  },
  {
    title: "Finance",
    items: [
      { slug: "accounts", label: "All Accounts", href: "/accounts", icon: BookOpen, keywords: "coa ledger balances register parties" },
      { slug: "accounts", label: "General Ledger", href: "/accounts/ledger", icon: BookOpen, keywords: "transactions pay receive" },
      { slug: "accounts", label: "Payments", href: "/accounts/payments", icon: Receipt, keywords: "cash bank transfer" },
      { slug: "accounts", label: "Expenses", href: "/accounts/expenses", icon: Wallet2, keywords: "business expenses" },
      { slug: "accounts", label: "Journal Entries", href: "/accounts/journal", icon: BookText, keywords: "double entry adjustments" },
      { slug: "accounts", label: "Day Close", href: "/accounts/day-close", icon: CalendarCheck, keywords: "daily cash reconcile" },
    ],
  },
  {
    title: "Administration",
    items: [
      { slug: "hr", label: "HR", href: "/hr", icon: Users, keywords: "employees payroll attendance" },
      { slug: "reports", label: "Reports", href: "/reports", icon: BarChart3, keywords: "analytics profit loss" },
      { slug: "settings", label: "Settings", href: "/settings", icon: Settings, keywords: "users cities configuration" },
    ],
  },
];

/** Dashboard shortcuts — flat list (no groups) */
export const DASHBOARD_SHORTCUTS = [
  { slug: "farmers", label: "Farmers", href: "/farmers" },
  { slug: "companies", label: "Companies", href: "/companies" },
  { slug: "shops", label: "Shops", href: "/shops" },
  { slug: "products", label: "Products", href: "/products" },
  { slug: "purchases", label: "Purchases", href: "/purchases" },
  { slug: "sales", label: "Sales", href: "/sales" },
  { slug: "orders", label: "Orders", href: "/orders" },
  { slug: "transport", label: "Transport", href: "/transport" },
  { slug: "accounts", label: "All Accounts", href: "/accounts" },
  { slug: "accounts", label: "General Ledger", href: "/accounts/ledger" },
  { slug: "accounts", label: "Payments", href: "/accounts/payments" },
  { slug: "accounts", label: "Expenses", href: "/accounts/expenses" },
  { slug: "accounts", label: "Journal", href: "/accounts/journal" },
  { slug: "accounts", label: "Day Close", href: "/accounts/day-close" },
  { slug: "hr", label: "HR", href: "/hr" },
  { slug: "reports", label: "Reports", href: "/reports" },
  { slug: "settings", label: "Settings", href: "/settings" },
];

/** Icon badges — dark sidebar nav + light dashboard shortcut tiles */
export const NAV_THEME = {
  dashboard: {
    inactive: "bg-white/[0.07] text-blue-300 ring-1 ring-white/10 shadow-sm",
    active: "bg-gradient-to-br from-[#0F52BA] to-[#0B3E8F] text-white shadow-lg shadow-blue-950/40 ring-1 ring-white/15",
    accent: "#0F52BA",
    tileIcon: "bg-blue-50 text-[#0F52BA] ring-1 ring-blue-100 shadow-sm",
    tileAccent: "bg-[#0F52BA]",
  },
  farmers: {
    inactive: "bg-white/[0.07] text-emerald-300 ring-1 ring-white/10 shadow-sm",
    active: "bg-gradient-to-br from-[#107C41] to-emerald-800 text-white shadow-lg shadow-emerald-950/35 ring-1 ring-white/15",
    accent: "#107C41",
    tileIcon: "bg-emerald-50 text-[#107C41] ring-1 ring-emerald-100 shadow-sm",
    tileAccent: "bg-[#107C41]",
  },
  companies: {
    inactive: "bg-white/[0.07] text-sky-300 ring-1 ring-white/10 shadow-sm",
    active: "bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-950/35 ring-1 ring-white/15",
    accent: "#2563EB",
    tileIcon: "bg-blue-50 text-blue-600 ring-1 ring-blue-100 shadow-sm",
    tileAccent: "bg-blue-500",
  },
  shops: {
    inactive: "bg-white/[0.07] text-amber-300 ring-1 ring-white/10 shadow-sm",
    active: "bg-gradient-to-br from-[#D87A00] to-amber-700 text-white shadow-lg shadow-amber-950/35 ring-1 ring-white/15",
    accent: "#D87A00",
    tileIcon: "bg-amber-50 text-[#D87A00] ring-1 ring-amber-100 shadow-sm",
    tileAccent: "bg-[#D87A00]",
  },
  products: {
    inactive: "bg-white/[0.07] text-violet-300 ring-1 ring-white/10 shadow-sm",
    active: "bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-lg shadow-violet-950/35 ring-1 ring-white/15",
    accent: "#6D28D9",
    tileIcon: "bg-violet-50 text-violet-700 ring-1 ring-violet-100 shadow-sm",
    tileAccent: "bg-violet-600",
  },
  purchases: {
    inactive: "bg-white/[0.07] text-blue-300 ring-1 ring-white/10 shadow-sm",
    active: "bg-gradient-to-br from-[#0F52BA] to-[#0B3E8F] text-white shadow-lg shadow-blue-950/35 ring-1 ring-white/15",
    accent: "#0F52BA",
    tileIcon: "bg-blue-50 text-[#0F52BA] ring-1 ring-blue-100 shadow-sm",
    tileAccent: "bg-[#0F52BA]",
  },
  sales: {
    inactive: "bg-white/[0.07] text-green-300 ring-1 ring-white/10 shadow-sm",
    active: "bg-gradient-to-br from-[#107C41] to-green-700 text-white shadow-lg shadow-green-950/35 ring-1 ring-white/15",
    accent: "#107C41",
    tileIcon: "bg-green-50 text-[#107C41] ring-1 ring-green-100 shadow-sm",
    tileAccent: "bg-[#107C41]",
  },
  orders: {
    inactive: "bg-white/[0.07] text-orange-300 ring-1 ring-white/10 shadow-sm",
    active: "bg-gradient-to-br from-orange-500 to-amber-700 text-white shadow-lg shadow-orange-950/35 ring-1 ring-white/15",
    accent: "#EA580C",
    tileIcon: "bg-orange-50 text-orange-600 ring-1 ring-orange-100 shadow-sm",
    tileAccent: "bg-orange-500",
  },
  transport: {
    inactive: "bg-white/[0.07] text-cyan-300 ring-1 ring-white/10 shadow-sm",
    active: "bg-gradient-to-br from-[#0078D4] to-cyan-700 text-white shadow-lg shadow-cyan-950/35 ring-1 ring-white/15",
    accent: "#0078D4",
    tileIcon: "bg-sky-50 text-[#0078D4] ring-1 ring-sky-100 shadow-sm",
    tileAccent: "bg-[#0078D4]",
  },
  accounts: {
    inactive: "bg-white/[0.07] text-teal-300 ring-1 ring-white/10 shadow-sm",
    active: "bg-gradient-to-br from-teal-600 to-emerald-800 text-white shadow-lg shadow-teal-950/35 ring-1 ring-white/15",
    accent: "#0F766E",
    tileIcon: "bg-teal-50 text-teal-700 ring-1 ring-teal-100 shadow-sm",
    tileAccent: "bg-teal-600",
  },
  projectAccounts: {
    inactive: "bg-white/[0.07] text-teal-300 ring-1 ring-white/10 shadow-sm",
    active: "bg-gradient-to-br from-teal-600 to-emerald-800 text-white shadow-lg shadow-teal-950/35 ring-1 ring-white/15",
    accent: "#0F766E",
    tileIcon: "bg-teal-50 text-teal-700 ring-1 ring-teal-100 shadow-sm",
    tileAccent: "bg-teal-600",
  },
  hr: {
    inactive: "bg-white/[0.07] text-pink-300 ring-1 ring-white/10 shadow-sm",
    active: "bg-gradient-to-br from-pink-500 to-rose-700 text-white shadow-lg shadow-pink-950/35 ring-1 ring-white/15",
    accent: "#BE185D",
    tileIcon: "bg-pink-50 text-pink-700 ring-1 ring-pink-100 shadow-sm",
    tileAccent: "bg-pink-600",
  },
  reports: {
    inactive: "bg-white/[0.07] text-teal-300 ring-1 ring-white/10 shadow-sm",
    active: "bg-gradient-to-br from-teal-600 to-emerald-700 text-white shadow-lg shadow-teal-950/35 ring-1 ring-white/15",
    accent: "#0D9488",
    tileIcon: "bg-teal-50 text-teal-700 ring-1 ring-teal-100 shadow-sm",
    tileAccent: "bg-teal-600",
  },
  settings: {
    inactive: "bg-white/[0.07] text-slate-300 ring-1 ring-white/10 shadow-sm",
    active: "bg-gradient-to-br from-[#4A5D6E] to-slate-700 text-white shadow-lg shadow-slate-950/35 ring-1 ring-white/15",
    accent: "#4A5D6E",
    tileIcon: "bg-slate-50 text-[#4A5D6E] ring-1 ring-slate-200 shadow-sm",
    tileAccent: "bg-[#4A5D6E]",
  },
};

export function isNavItemActive(pathname, href) {
  if (href === "/accounts") {
    return pathname === "/accounts";
  }
  if (href === "/orders/my" || href === "/orders") {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function flattenNavItems(sections) {
  return sections.flatMap((section) =>
    section.items.map((item) => ({ ...item, section: section.title }))
  );
}

/** Resolve nav icon from slug or exact href (for finance sub-routes) */
export function navIconForSlug(slug, href) {
  if (href) {
    const byHref = NAV_SECTIONS.flatMap((s) => s.items).find((i) => i.href === href);
    if (byHref?.icon) return byHref.icon;
  }
  return NAV_SECTIONS.flatMap((s) => s.items).find((i) => i.slug === slug)?.icon ?? null;
}

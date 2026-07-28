import {
  LayoutDashboard, Sprout, Building2, Store, Package,
  ShoppingCart, DollarSign, Truck, BookOpen, Users,
  BarChart3, Settings, FolderTree, Receipt, Wallet2, BookText, CalendarCheck,
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
      { slug: "accounts", label: "Chart of Accounts", href: "/accounts", icon: BookOpen, keywords: "coa ledger balances" },
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
      { slug: "projectAccounts", label: "Project Accounts", href: "/accounts/directory", icon: FolderTree, keywords: "register parties cash bank" },
      { slug: "hr", label: "HR", href: "/hr", icon: Users, keywords: "employees payroll attendance" },
      { slug: "reports", label: "Reports", href: "/reports", icon: BarChart3, keywords: "analytics profit loss" },
      { slug: "settings", label: "Settings", href: "/settings", icon: Settings, keywords: "users cities configuration" },
    ],
  },
];

/** Icon badges — dark shell sidebar */
export const NAV_THEME = {
  dashboard: {
    inactive: "bg-white/[0.07] text-slate-300 ring-1 ring-white/10",
    active: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-900/40",
    accent: "#34d399",
  },
  farmers: {
    inactive: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20",
    active: "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-900/35",
    accent: "#34d399",
  },
  companies: {
    inactive: "bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/20",
    active: "bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-blue-900/35",
    accent: "#38bdf8",
  },
  shops: {
    inactive: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20",
    active: "bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-900/35",
    accent: "#fbbf24",
  },
  products: {
    inactive: "bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/20",
    active: "bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-900/35",
    accent: "#a78bfa",
  },
  purchases: {
    inactive: "bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/20",
    active: "bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-900/35",
    accent: "#60a5fa",
  },
  sales: {
    inactive: "bg-lime-500/15 text-lime-300 ring-1 ring-lime-500/20",
    active: "bg-gradient-to-br from-lime-500 to-green-600 text-white shadow-lg shadow-green-900/35",
    accent: "#a3e635",
  },
  orders: {
    inactive: "bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/20",
    active: "bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-900/35",
    accent: "#fb923c",
  },
  transport: {
    inactive: "bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/20",
    active: "bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow-lg shadow-cyan-900/35",
    accent: "#22d3ee",
  },
  accounts: {
    inactive: "bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/20",
    active: "bg-gradient-to-br from-teal-500 to-emerald-700 text-white shadow-lg shadow-teal-900/35",
    accent: "#2dd4bf",
  },
  projectAccounts: {
    inactive: "bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/20",
    active: "bg-gradient-to-br from-teal-600 to-emerald-800 text-white shadow-lg shadow-teal-900/40",
    accent: "#14b8a6",
  },
  hr: {
    inactive: "bg-fuchsia-500/15 text-fuchsia-300 ring-1 ring-fuchsia-500/20",
    active: "bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white shadow-lg shadow-fuchsia-900/35",
    accent: "#e879f9",
  },
  reports: {
    inactive: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20",
    active: "bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-900/35",
    accent: "#34d399",
  },
  settings: {
    inactive: "bg-white/[0.07] text-slate-400 ring-1 ring-white/10",
    active: "bg-gradient-to-br from-slate-500 to-slate-700 text-white shadow-lg shadow-black/30",
    accent: "#94a3b8",
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

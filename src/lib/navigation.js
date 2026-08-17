import {
  LayoutDashboard, Package,
  ShoppingCart, DollarSign, Truck, BookOpen, Users,
  BarChart3, Settings, Receipt, Wallet2, BookText,
  Car,
} from "lucide-react";

export const NAV_SECTIONS = [
  {
    title: "Overview",
    items: [
      { slug: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, keywords: "home overview stats" },
    ],
  },
  {
    title: "Purchase & Sales",
    items: [
      { slug: "purchases", label: "Purchases", href: "/purchases", icon: ShoppingCart, keywords: "buy procurement" },
      { slug: "sales", label: "Sales", href: "/sales", icon: DollarSign, keywords: "sell invoices" },
      { slug: "orders", label: "Orders", href: "/orders", icon: Receipt, keywords: "customer orders quotes" },
      { slug: "accounts", label: "Freight Pay", href: "/accounts/freight-pay", icon: Truck, keywords: "transport freight purchase bills deduct" },
    ],
  },
  {
    title: "Accounts",
    items: [
      { slug: "accounts", label: "All Accounts", href: "/accounts", icon: BookOpen, keywords: "coa ledger balances register parties" },
      { slug: "accounts", label: "General Ledger", href: "/accounts/ledger", icon: BookOpen, keywords: "transactions pay receive" },
    ],
  },
  {
    title: "Finance",
    items: [
      { slug: "accounts", label: "Payments", href: "/accounts/payments", icon: Receipt, keywords: "cash bank transfer" },
      { slug: "accounts", label: "Expenses", href: "/accounts/expenses", icon: Wallet2, keywords: "business expenses" },
      { slug: "accounts", label: "Journal Entries", href: "/accounts/journal", icon: BookText, keywords: "double entry adjustments" },
    ],
  },
  {
    title: "Vehicle Management",
    items: [
      { slug: "transport", label: "Fleet & Vehicles", href: "/transport/vehicles", icon: Car, keywords: "fleet trucks registration expenses" },
      { slug: "transport", label: "Transport Trips", href: "/transport", icon: Truck, keywords: "delivery freight logistics" },
    ],
  },
  {
    title: "Inventory",
    items: [
      { slug: "products", label: "Products", href: "/products", icon: Package, keywords: "stock feed inventory" },
      { slug: "products", label: "Inventory Report", href: "/reports/inventory", icon: BarChart3, keywords: "stock levels valuation movements report" },
    ],
  },
  {
    title: "Administration",
    items: [
      { slug: "hr", label: "HR", href: "/hr", icon: Users, keywords: "employees payroll attendance" },
      { slug: "reports", label: "Reports", href: "/reports", icon: BarChart3, keywords: "analytics profit loss" },
      { slug: "settings", label: "Owner Withdrawals", href: "/admin/withdrawals", icon: Wallet2, keywords: "owner personal drawings admin" },
      { slug: "settings", label: "Settings", href: "/settings", icon: Settings, keywords: "users cities company profile" },
    ],
  },
];

/** Dashboard shortcuts — flat list (no groups) */
export const DASHBOARD_SHORTCUTS = [
  { slug: "farmers", label: "Farmers", href: "/farmers" },
  { slug: "companies", label: "Companies", href: "/companies" },
  { slug: "shops", label: "Shops", href: "/shops" },
  { slug: "products", label: "Products", href: "/products" },
  { slug: "products", label: "Inventory Report", href: "/reports/inventory" },
  { slug: "purchases", label: "Purchases", href: "/purchases" },
  { slug: "sales", label: "Sales", href: "/sales" },
  { slug: "orders", label: "Orders", href: "/orders" },
  { slug: "accounts", label: "Freight Pay", href: "/accounts/freight-pay" },
  { slug: "transport", label: "Transport Trips", href: "/transport" },
  { slug: "transport", label: "Fleet & Vehicles", href: "/transport/vehicles" },
  { slug: "accounts", label: "All Accounts", href: "/accounts" },
  { slug: "accounts", label: "General Ledger", href: "/accounts/ledger" },
  { slug: "accounts", label: "Payments", href: "/accounts/payments" },
  { slug: "accounts", label: "Expenses", href: "/accounts/expenses" },
  { slug: "accounts", label: "Journal", href: "/accounts/journal" },
  { slug: "hr", label: "HR", href: "/hr" },
  { slug: "reports", label: "Reports", href: "/reports" },
  { slug: "settings", label: "Owner Withdrawals", href: "/admin/withdrawals" },
  { slug: "settings", label: "Settings", href: "/settings" },
];

/** Icon badges — dark sidebar nav + light dashboard shortcut tiles */
export const NAV_THEME = {
  dashboard: {
    inactive: "bg-white/[0.04] text-blue-400 border border-white/5",
    active: "bg-gradient-to-br from-[#0F52BA] to-[#0B3E8F] text-white shadow-md shadow-blue-950/50 border border-white/15",
    accent: "#3B82F6",
    tileIcon: "bg-blue-50 text-[#0F52BA] ring-1 ring-blue-100 shadow-sm",
    tileAccent: "bg-[#0F52BA]",
  },
  farmers: {
    inactive: "bg-white/[0.04] text-emerald-400 border border-white/5",
    active: "bg-gradient-to-br from-[#107C41] to-emerald-800 text-white shadow-md shadow-emerald-950/40 border border-white/15",
    accent: "#10B981",
    tileIcon: "bg-emerald-50 text-[#107C41] ring-1 ring-emerald-100 shadow-sm",
    tileAccent: "bg-[#107C41]",
  },
  companies: {
    inactive: "bg-white/[0.04] text-sky-400 border border-white/5",
    active: "bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-md shadow-blue-950/40 border border-white/15",
    accent: "#0EA5E9",
    tileIcon: "bg-blue-50 text-blue-600 ring-1 ring-blue-100 shadow-sm",
    tileAccent: "bg-blue-500",
  },
  shops: {
    inactive: "bg-white/[0.04] text-amber-400 border border-white/5",
    active: "bg-gradient-to-br from-[#D87A00] to-amber-700 text-white shadow-md shadow-amber-950/40 border border-white/15",
    accent: "#F59E0B",
    tileIcon: "bg-amber-50 text-[#D87A00] ring-1 ring-amber-100 shadow-sm",
    tileAccent: "bg-[#D87A00]",
  },
  products: {
    inactive: "bg-white/[0.04] text-violet-400 border border-white/5",
    active: "bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-md shadow-violet-950/40 border border-white/15",
    accent: "#8B5CF6",
    tileIcon: "bg-violet-50 text-violet-700 ring-1 ring-violet-100 shadow-sm",
    tileAccent: "bg-violet-600",
  },
  purchases: {
    inactive: "bg-white/[0.04] text-blue-400 border border-white/5",
    active: "bg-gradient-to-br from-[#0F52BA] to-[#0B3E8F] text-white shadow-md shadow-blue-950/40 border border-white/15",
    accent: "#3B82F6",
    tileIcon: "bg-blue-50 text-[#0F52BA] ring-1 ring-blue-100 shadow-sm",
    tileAccent: "bg-[#0F52BA]",
  },
  sales: {
    inactive: "bg-white/[0.04] text-green-400 border border-white/5",
    active: "bg-gradient-to-br from-[#107C41] to-green-700 text-white shadow-md shadow-green-950/40 border border-white/15",
    accent: "#22C55E",
    tileIcon: "bg-green-50 text-[#107C41] ring-1 ring-green-100 shadow-sm",
    tileAccent: "bg-[#107C41]",
  },
  orders: {
    inactive: "bg-white/[0.04] text-orange-400 border border-white/5",
    active: "bg-gradient-to-br from-orange-500 to-amber-700 text-white shadow-md shadow-orange-950/40 border border-white/15",
    accent: "#F97316",
    tileIcon: "bg-orange-50 text-orange-600 ring-1 ring-orange-100 shadow-sm",
    tileAccent: "bg-orange-500",
  },
  transport: {
    inactive: "bg-white/[0.04] text-cyan-400 border border-white/5",
    active: "bg-gradient-to-br from-[#0078D4] to-cyan-700 text-white shadow-md shadow-cyan-950/40 border border-white/15",
    accent: "#06B6D4",
    tileIcon: "bg-sky-50 text-[#0078D4] ring-1 ring-sky-100 shadow-sm",
    tileAccent: "bg-[#0078D4]",
  },
  accounts: {
    inactive: "bg-white/[0.04] text-teal-400 border border-white/5",
    active: "bg-gradient-to-br from-teal-600 to-emerald-800 text-white shadow-md shadow-teal-950/40 border border-white/15",
    accent: "#14B8A6",
    tileIcon: "bg-teal-50 text-teal-700 ring-1 ring-teal-100 shadow-sm",
    tileAccent: "bg-teal-600",
  },
  projectAccounts: {
    inactive: "bg-white/[0.04] text-teal-400 border border-white/5",
    active: "bg-gradient-to-br from-teal-600 to-emerald-800 text-white shadow-md shadow-teal-950/40 border border-white/15",
    accent: "#14B8A6",
    tileIcon: "bg-teal-50 text-teal-700 ring-1 ring-teal-100 shadow-sm",
    tileAccent: "bg-teal-600",
  },
  hr: {
    inactive: "bg-white/[0.04] text-pink-400 border border-white/5",
    active: "bg-gradient-to-br from-pink-500 to-rose-700 text-white shadow-md shadow-pink-950/40 border border-white/15",
    accent: "#EC4899",
    tileIcon: "bg-pink-50 text-pink-700 ring-1 ring-pink-100 shadow-sm",
    tileAccent: "bg-pink-600",
  },
  reports: {
    inactive: "bg-white/[0.04] text-teal-400 border border-white/5",
    active: "bg-gradient-to-br from-teal-600 to-emerald-700 text-white shadow-md shadow-teal-950/40 border border-white/15",
    accent: "#0D9488",
    tileIcon: "bg-teal-50 text-teal-700 ring-1 ring-teal-100 shadow-sm",
    tileAccent: "bg-teal-600",
  },
  settings: {
    inactive: "bg-white/[0.04] text-slate-400 border border-white/5",
    active: "bg-gradient-to-br from-[#4A5D6E] to-slate-700 text-white shadow-md shadow-slate-950/40 border border-white/15",
    accent: "#64748B",
    tileIcon: "bg-slate-50 text-[#4A5D6E] ring-1 ring-slate-200 shadow-sm",
    tileAccent: "bg-[#4A5D6E]",
  },
};

export function isNavItemActive(pathname, href) {
  if (href === "/accounts") {
    return pathname === "/accounts";
  }
  if (href === "/reports") {
    return pathname === "/reports";
  }
  if (href === "/transport") {
    return pathname === "/transport" || pathname.startsWith("/transport/new");
  }
  if (href === "/transport/vehicles") {
    return pathname === "/transport/vehicles" || pathname.startsWith("/transport/vehicles/");
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

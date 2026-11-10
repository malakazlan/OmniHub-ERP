export const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  SALESPERSON: "salesperson",
  ACCOUNTANT: "accountant",
  DRIVER: "driver",
  VIEWER: "viewer",
};

export const MODULES = [
  "dashboard",
  "farmers",
  "companies",
  "shops",
  "dealers",
  "products",
  "purchases",
  "sales",
  "orders",
  "transport",
  "accounts",
  "hr",
  "reports",
  "settings",
];

export const PRODUCT_UNITS = ["ea", "case", "pallet", "lb", "ft", "gal"];

/** Default units per case (legacy name kept for existing imports; drives case/unit conversions). */
export const BAG_WEIGHT_KG = 34;
export const UNITS_PER_CASE = BAG_WEIGHT_KG;

export const COMPANY_TYPES = ["supplier", "buyer", "both"];

/** Display labels for Company.companyType (Customers & Vendors directory) */
export const COMPANY_TYPE_LABELS = {
  supplier: "Vendor",
  buyer: "Customer",
  both: "Customer & Vendor",
};

/** Feed-era party modules hidden from the product UI (slugs kept for stored allowedModules) */
export const HIDDEN_MODULES = ["farmers", "shops", "dealers"];

/** Modules shown in navigation, module-access settings, and dashboards */
export const VISIBLE_MODULES = MODULES.filter((m) => !HIDDEN_MODULES.includes(m));

/** Account categories that belonged to the hidden party modules */
export const HIDDEN_ACCOUNT_CATEGORIES = ["farmer", "shop"];

export const SHOP_TYPES = ["retail", "wholesale", "distributor"];

export const PAYMENT_STATUSES = ["unpaid", "partial", "paid"];

export const PURCHASE_STATUSES = ["draft", "confirmed", "received", "cancelled"];

export const SALE_STATUSES = ["draft", "confirmed", "dispatched", "delivered", "cancelled"];

export const CUSTOMER_ORDER_STATUSES = ["pending", "accepted", "rejected", "converted"];

export const TRANSPORT_STATUSES = ["pending", "in_transit", "delivered", "cancelled"];

export const ACCOUNT_TYPES = ["asset", "liability", "equity", "revenue", "expense"];

export const ACCOUNT_CATEGORIES = [
  "farmer", "company", "shop", "bank", "cash", "transport", "expense", "salary", "general",
];

export const CURRENCY = "USD";
export const CURRENCY_SYMBOL = "$";

export const MODULE_ACCENTS = {
  dashboard: { light: "#6366F1", dark: "#818CF8", label: "Dashboard" },
  farmers: { light: "#059669", dark: "#34D399", label: "Farmers" },
  companies: { light: "#2563EB", dark: "#60A5FA", label: "Customers & Vendors" },
  shops: { light: "#D97706", dark: "#FBBF24", label: "Shops" },
  dealers: { light: "#7C3AED", dark: "#A78BFA", label: "Dealers" },
  products: { light: "#7C3AED", dark: "#A78BFA", label: "Items" },
  purchases: { light: "#2563EB", dark: "#60A5FA", label: "Purchase Orders" },
  sales: { light: "#16A34A", dark: "#4ADE80", label: "Invoices" },
  orders: { light: "#EA580C", dark: "#FB923C", label: "Sales Orders" },
  transport: { light: "#0891B2", dark: "#22D3EE", label: "Deliveries" },
  accounts: { light: "#4338CA", dark: "#6366F1", label: "Accounting" },
  hr: { light: "#BE185D", dark: "#F472B6", label: "Employees & Payroll" },
  reports: { light: "#0D9488", dark: "#2DD4BF", label: "Reports" },
  settings: { light: "#525252", dark: "#A3A3A3", label: "Settings" },
};

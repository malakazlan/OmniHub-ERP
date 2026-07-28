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

export const PRODUCT_UNITS = ["kg", "ton", "bag", "piece"];

export const BAG_WEIGHT_KG = 34;

export const COMPANY_TYPES = ["supplier", "buyer", "both"];

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

export const CURRENCY = "PKR";
export const CURRENCY_SYMBOL = "₨";

export const MODULE_ACCENTS = {
  dashboard: { light: "#6366F1", dark: "#818CF8", label: "Dashboard" },
  farmers: { light: "#059669", dark: "#34D399", label: "Farmers" },
  companies: { light: "#2563EB", dark: "#60A5FA", label: "Companies" },
  shops: { light: "#D97706", dark: "#FBBF24", label: "Shops" },
  products: { light: "#7C3AED", dark: "#A78BFA", label: "Products" },
  purchases: { light: "#2563EB", dark: "#60A5FA", label: "Purchases" },
  sales: { light: "#16A34A", dark: "#4ADE80", label: "Sales" },
  orders: { light: "#EA580C", dark: "#FB923C", label: "Orders" },
  transport: { light: "#0891B2", dark: "#22D3EE", label: "Transport" },
  accounts: { light: "#4338CA", dark: "#6366F1", label: "Accounting" },
  hr: { light: "#BE185D", dark: "#F472B6", label: "HR" },
  reports: { light: "#0D9488", dark: "#2DD4BF", label: "Reports" },
  settings: { light: "#525252", dark: "#A3A3A3", label: "Settings" },
};

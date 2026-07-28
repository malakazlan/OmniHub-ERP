import { CURRENCY_SYMBOL } from "./constants";

export function formatCurrency(amount, showSymbol = true) {
  const num = Number(amount) || 0;
  const formatted = num.toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return showSymbol ? `${CURRENCY_SYMBOL} ${formatted}` : formatted;
}

export function formatDate(date, options = {}) {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  });
}

export function formatDateTime(date) {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatQuantity(qty, unit) {
  const num = Number(qty) || 0;
  return `${num.toLocaleString("en-PK")} ${unit || "kg"}`;
}

export function formatPhone(phone) {
  if (!phone) return "—";
  return phone;
}

export function parseNumber(value, fallback = 0) {
  const num = parseFloat(value);
  return isNaN(num) ? fallback : num;
}

import { CURRENCY_SYMBOL } from "./constants";

export function formatCurrency(amount, showSymbol = true) {
  const num = Number(amount) || 0;
  const formatted = num.toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return showSymbol ? `${CURRENCY_SYMBOL} ${formatted}` : formatted;
}

/** ASCII-safe currency for PDF export (jsPDF standard fonts cannot render ₨). */
export function formatCurrencyForPdf(amount) {
  const num = Number(amount) || 0;
  const formatted = num.toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `Rs. ${formatted}`;
}

/** Strip/replace Unicode characters that break jsPDF Helvetica output. */
export function pdfSafeText(value) {
  if (value == null || value === "") return "-";
  return String(value)
    .replace(/\u20A8/g, "Rs.")
    .replace(/\u2014/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');
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

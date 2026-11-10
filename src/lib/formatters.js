import { CURRENCY_SYMBOL } from "./constants";

const USD_FORMAT = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

/** $1,234.56 — negatives render as -$1,234.56 */
export function formatCurrency(amount, showSymbol = true) {
  const num = Number(amount) || 0;
  const formatted = Math.abs(num).toLocaleString("en-US", USD_FORMAT);
  const sign = num < 0 ? "-" : "";
  return showSymbol ? `${sign}${CURRENCY_SYMBOL}${formatted}` : `${sign}${formatted}`;
}

/** ASCII-safe currency for PDF export (jsPDF standard fonts render "$" fine). */
export function formatCurrencyForPdf(amount) {
  return formatCurrency(amount, true);
}

/** Strip/replace Unicode characters that break jsPDF Helvetica output. */
export function pdfSafeText(value) {
  if (value == null || value === "") return "-";
  return String(value)
    .replace(/\u20A8/g, "$")
    .replace(/\u2014/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');
}

export function formatDate(date, options = {}) {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    ...options,
  });
}

export function formatDateTime(date) {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatQuantity(qty, unit) {
  const num = Number(qty) || 0;
  return `${num.toLocaleString("en-US")} ${unit || "ea"}`;
}

export function formatPhone(phone) {
  if (!phone) return "—";
  return phone;
}

export function parseNumber(value, fallback = 0) {
  const num = parseFloat(value);
  return isNaN(num) ? fallback : num;
}

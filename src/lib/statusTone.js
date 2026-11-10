/**
 * Map document statuses to the semantic pill tones used by <Badge>.
 * Keeps colour meaning identical across invoices, purchase orders, sales orders and deliveries.
 */
const PAYMENT_TONES = { paid: "ok", partial: "warn", unpaid: "bad", refunded: "neutral" };

const ORDER_TONES = {
  delivered: "ok",
  received: "ok",
  converted: "ok",
  accepted: "ok",
  confirmed: "info",
  dispatched: "info",
  in_transit: "info",
  pending: "neutral",
  draft: "neutral",
  cancelled: "bad",
  rejected: "bad",
};

export function paymentStatusTone(status) {
  return PAYMENT_TONES[String(status || "").toLowerCase()] || "neutral";
}

export function orderStatusTone(status) {
  return ORDER_TONES[String(status || "").toLowerCase()] || "neutral";
}

/** "in_transit" -> "In transit" */
export function statusLabel(status, fallback = "—") {
  const raw = String(status || "").trim();
  if (!raw) return fallback;
  const words = raw.replace(/_/g, " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

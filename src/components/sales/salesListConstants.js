export const SALES_STATUS_FILTERS = [
  { key: "all", label: "All invoices" },
  { key: "draft", label: "Drafts" },
  { key: "confirmed", label: "Confirmed" },
  { key: "dispatched", label: "Dispatched" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

export const SALES_PAYMENT_FILTERS = [
  { key: "all", label: "Any payment" },
  { key: "unpaid", label: "Unpaid" },
  { key: "partial", label: "Partial" },
  { key: "paid", label: "Paid" },
];

export const SALES_PERIOD_FILTERS = [
  { key: "all", label: "All time" },
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
];

export const SALES_CUSTOMER_FILTERS = [
  { key: "all", label: "All customers" },
  { key: "company", label: "Customers" },
  { key: "walkin", label: "Walk-in" },
];

export const SALES_STATUS_PILL = {
  draft: "is-draft",
  confirmed: "is-confirmed",
  dispatched: "is-dispatched",
  delivered: "is-delivered",
  cancelled: "is-cancelled",
};

export const SALES_PAYMENT_PILL = {
  unpaid: "is-unpaid",
  partial: "is-partial",
  paid: "is-paid",
};

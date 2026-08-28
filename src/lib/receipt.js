import prisma from "./prisma";
import { findLatestByPrefix } from "./dbPrefixQuery";

const PREFIXES = {
  purchase: "PO",
  sale: "INV",
  purchaseReturn: "PR",
  saleReturn: "SR",
  payment: "PAY",
  expense: "EXP",
  transport: "TR",
  journal: "JE",
  customerOrder: "ORD",
  ownerWithdrawal: "WD",
  transfer: "TRF",
  donation: "DON",
};

/**
 * Generate next sequential document number: PREFIX-YYYY0001
 */
export async function generateDocumentNumber(type, date = new Date()) {
  const prefix = PREFIXES[type];
  if (!prefix) throw new Error(`Unknown document type: ${type}`);

  const year = date.getFullYear();
  const pattern = `${prefix}-${year}`;

  const counters = {
    purchase: () => findLatestByPrefix("purchase_orders", "purchaseNumber", pattern),
    sale: () => findLatestByPrefix("sale_orders", "invoiceNumber", pattern),
    purchaseReturn: () => findLatestByPrefix("purchase_returns", "returnNumber", pattern),
    saleReturn: () => findLatestByPrefix("sale_returns", "returnNumber", pattern),
    payment: () => findLatestByPrefix("payments", "paymentNumber", pattern),
    expense: () => findLatestByPrefix("expenses", "expenseNumber", pattern),
    transport: () => findLatestByPrefix("transports", "transportNumber", pattern),
    journal: () => findLatestByPrefix("journal_entries", "entryNumber", pattern),
    customerOrder: () => findLatestByPrefix("customer_orders", "orderNumber", pattern),
    ownerWithdrawal: () => findLatestByPrefix("owner_withdrawals", "withdrawalNumber", pattern),
    transfer: () => findLatestByPrefix("journal_entries", "entryNumber", pattern),
    donation: () => findLatestByPrefix("donations", "donationNumber", pattern),
  };

  const fetcher = counters[type];
  const last = await fetcher();

  let nextSeq = 1;
  if (last) {
    const seqPart = last.replace(`${pattern}`, "");
    const parsed = parseInt(seqPart, 10);
    if (!isNaN(parsed)) nextSeq = parsed + 1;
  }

  return `${pattern}${String(nextSeq).padStart(4, "0")}`;
}

export async function generateAccountCode(category, db = prisma) {
  const prefix = category.toUpperCase().slice(0, 3);
  // Require trailing segment (ACC-CAS-001) so seed codes like ACC-CASH / ACC-BANK are not matched.
  const codePrefix = `ACC-${prefix}-`;
  const last = await findLatestByPrefix("accounts", "code", codePrefix, db);

  let nextSeq = 1;
  if (last) {
    const parts = last.split("-");
    const parsed = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(parsed)) nextSeq = parsed + 1;
  }

  return `${codePrefix}${String(nextSeq).padStart(3, "0")}`;
}

export async function generateSKU(categoryName) {
  const prefix = categoryName.replace(/\s+/g, "").slice(0, 3).toUpperCase();
  const last = await findLatestByPrefix("products", "sku", prefix);

  let nextSeq = 1;
  if (last) {
    const parsed = parseInt(last.replace(prefix, ""), 10);
    if (!isNaN(parsed)) nextSeq = parsed + 1;
  }

  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}

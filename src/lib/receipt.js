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

/** Table/column that holds each document type's number, used once to seed a new counter from existing data. */
const SOURCES = {
  purchase: ["purchase_orders", "purchaseNumber"],
  sale: ["sale_orders", "invoiceNumber"],
  purchaseReturn: ["purchase_returns", "returnNumber"],
  saleReturn: ["sale_returns", "returnNumber"],
  payment: ["payments", "paymentNumber"],
  expense: ["expenses", "expenseNumber"],
  transport: ["transports", "transportNumber"],
  journal: ["journal_entries", "entryNumber"],
  customerOrder: ["customer_orders", "orderNumber"],
  ownerWithdrawal: ["owner_withdrawals", "withdrawalNumber"],
  transfer: ["journal_entries", "entryNumber"],
  donation: ["donations", "donationNumber"],
};

function trailingInteger(value, prefix) {
  if (!value) return 0;
  const parsed = parseInt(String(value).slice(prefix.length), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Reserve the next integer for `name` under a row lock.
 *
 * - Called with an interactive-transaction client, the lock is held until the
 *   caller commits, so concurrent creators are serialized and no number is skipped.
 * - Called with the root client, a short transaction reserves the number and
 *   commits immediately. If the caller's insert later fails the number is
 *   skipped, which is acceptable; two documents can never share one.
 *
 * `seed` computes the starting value from existing rows the first time a
 * counter is seen, so numbering continues from data created before the
 * counter table existed.
 */
async function reserveNext(db, name, seed) {
  const run = async (tx) => {
    const rows = await tx.$queryRaw`SELECT nextValue FROM document_sequences WHERE seq_name = ${name} FOR UPDATE`;
    if (rows.length > 0) {
      const value = Number(rows[0].nextValue);
      await tx.$executeRaw`UPDATE document_sequences SET nextValue = ${value + 1}, updatedAt = NOW(3) WHERE seq_name = ${name}`;
      return value;
    }
    const first = (await seed(tx)) + 1;
    await tx.$executeRaw`INSERT INTO document_sequences (seq_name, nextValue, updatedAt) VALUES (${name}, ${first + 1}, NOW(3))`;
    return first;
  };

  return typeof db.$transaction === "function" ? db.$transaction(run) : run(db);
}

/**
 * Next sequential document number, e.g. INV-20260001. Safe under concurrency.
 * Pass the active transaction client as `db` when the number is used inside a transaction.
 */
export async function generateDocumentNumber(type, date = new Date(), db = prisma) {
  const prefix = PREFIXES[type];
  if (!prefix) throw new Error(`Unknown document type: ${type}`);

  const year = (date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date()).getFullYear();
  const pattern = `${prefix}-${year}`;
  const [table, column] = SOURCES[type];

  const next = await reserveNext(db, pattern, async (tx) =>
    trailingInteger(await findLatestByPrefix(table, column, pattern, tx), pattern)
  );

  return `${pattern}${String(next).padStart(4, "0")}`;
}

/** Next ledger account code for a category, e.g. ACC-CAS-001. */
export async function generateAccountCode(category, db = prisma) {
  const codePrefix = `ACC-${category.toUpperCase().slice(0, 3)}-`;

  const next = await reserveNext(db, codePrefix, async (tx) =>
    trailingInteger(await findLatestByPrefix("accounts", "code", codePrefix, tx), codePrefix)
  );

  return `${codePrefix}${String(next).padStart(3, "0")}`;
}

/** Next SKU for an item category, e.g. PLU0001. */
export async function generateSKU(categoryName, db = prisma) {
  const prefix = categoryName.replace(/\s+/g, "").slice(0, 3).toUpperCase();

  const next = await reserveNext(db, `SKU:${prefix}`, async (tx) =>
    trailingInteger(await findLatestByPrefix("products", "sku", prefix, tx), prefix)
  );

  return `${prefix}${String(next).padStart(4, "0")}`;
}

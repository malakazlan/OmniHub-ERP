import prisma from "./prisma";
import { serializeLedgerLineItems, parseLedgerLineItems } from "./ledgerDisplay";

export { serializeLedgerLineItems, parseLedgerLineItems } from "./ledgerDisplay";

/** Oldest first — new entries appear at the bottom (statement / register order). */
export const LEDGER_ENTRY_ORDER = [{ date: "asc" }, { id: "asc" }];

/** Normalize ledger dates to start of local calendar day (opening balances sort first). */
export function startOfLedgerDay(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(d.getTime())) return new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

export function isOpeningBalanceEntry(entry) {
  if (!entry) return false;
  if (entry.referenceType === "OpeningBalance") return true;
  return String(entry.description || "").trim().toLowerCase() === "opening balance";
}

/** Statement order: date asc → opening balance first on same day → entry id (posting time). */
export function compareLedgerEntries(a, b) {
  const da = startOfLedgerDay(a.date).getTime();
  const db = startOfLedgerDay(b.date).getTime();
  if (da !== db) return da - db;

  const aOpen = isOpeningBalanceEntry(a) ? 0 : 1;
  const bOpen = isOpeningBalanceEntry(b) ? 0 : 1;
  if (aOpen !== bOpen) return aOpen - bOpen;

  // Use ledger entry id — reflects when the transaction was posted (not account id grouping).
  const aId = a.id || 0;
  const bId = b.id || 0;
  if (aId !== bId) return aId - bId;

  // Same journal: debit line before credit when ids tie (should not happen).
  return (b.debit || 0) - (a.debit || 0);
}

export function sortLedgerEntries(entries = []) {
  return [...entries].sort(compareLedgerEntries);
}

/** Recompute running balance column from debit/credit in proper statement order. */
/**
 * Compute running balances in statement order. `openingByAccount` carries the
 * balance brought forward when the entries were filtered by a start date, so a
 * date-ranged statement does not restart from zero.
 */
export function applyRunningBalances(entries = [], openingByAccount = {}) {
  const sorted = sortLedgerEntries(entries);
  const runningByAccount = { ...openingByAccount };

  return sorted.map((entry) => {
    const accountId = entry.accountId;
    runningByAccount[accountId] =
      (runningByAccount[accountId] || 0) + (entry.debit || 0) - (entry.credit || 0);
    return {
      ...entry,
      balance: Math.round(runningByAccount[accountId] * 100) / 100,
    };
  });
}

/** Sort + running balances for API responses. */
export function prepareLedgerEntriesForDisplay(entries = []) {
  return applyRunningBalances(entries);
}

/** Persist correct running balances after inserts, back-dated entries, or date changes. */
export async function recomputeAndPersistAccountLedgerBalances(tx, accountId) {
  const id = parseInt(accountId, 10);
  if (!id) return 0;

  const entries = await tx.ledgerEntry.findMany({
    where: { accountId: id },
    select: { id: true, date: true, debit: true, credit: true, referenceType: true, description: true, reference: true },
  });

  const dateFixes = [];
  for (const entry of entries) {
    if (!isOpeningBalanceEntry(entry)) continue;
    const normalized = startOfLedgerDay(entry.date);
    const patch = {};
    if (Math.abs(normalized.getTime() - new Date(entry.date).getTime()) > 1000) {
      patch.date = normalized;
      entry.date = normalized;
    }
    if (entry.referenceType !== "OpeningBalance") {
      patch.referenceType = "OpeningBalance";
    }
    if (Object.keys(patch).length) {
      dateFixes.push(
        tx.ledgerEntry.update({
          where: { id: entry.id },
          data: patch,
        })
      );
    }
  }
  if (dateFixes.length) await Promise.all(dateFixes);

  // Running balances are derived on read (applyRunningBalances); only the
  // account total is persisted. Rewriting every row's balance here serialized
  // all writers on shared cash/bank accounts and caused lock-wait timeouts.
  let running = 0;
  for (const entry of entries) {
    running += (entry.debit || 0) - (entry.credit || 0);
  }

  const finalBalance = Math.round(running * 100) / 100;
  await tx.account.update({
    where: { id },
    data: { balance: finalBalance },
  });

  return finalBalance;
}

/**
 * Current bill posting legs only — skips SaleOrder/PurchaseOrder rows already
 * reversed by a prior correction (entries at or before the last correction id).
 */
export async function findActiveOrderLedgerEntries(
  tx,
  { orderReferenceType, correctionReferenceType, orderId }
) {
  const lastCorrection = await tx.ledgerEntry.findFirst({
    where: { referenceType: correctionReferenceType, referenceId: orderId },
    orderBy: { id: "desc" },
    select: { id: true },
  });

  return tx.ledgerEntry.findMany({
    where: {
      referenceType: orderReferenceType,
      referenceId: orderId,
      ...(lastCorrection ? { id: { gt: lastCorrection.id } } : {}),
    },
    orderBy: { id: "asc" },
  });
}

/**
 * Create a ledger entry and update account running balance.
 */
export async function createLedgerEntry(tx, {
  accountId,
  date,
  description,
  reference,
  referenceType,
  referenceId,
  debit = 0,
  credit = 0,
  lineItems = null,
}) {
  const [entry] = await createLedgerEntries(tx, [
    { accountId, date, description, reference, referenceType, referenceId, debit, credit, lineItems },
  ]);
  return entry;
}

/**
 * Post multiple ledger lines in one pass: one account load, createMany entries,
 * parallel balance updates. Much faster than repeated createLedgerEntry calls.
 */
export async function createLedgerEntries(tx, entries = []) {
  const normalized = entries
    .map((e) => ({
      accountId: parseInt(e.accountId, 10),
      date: e.date ? new Date(e.date) : new Date(),
      description: e.description,
      reference: e.reference ?? null,
      referenceType: e.referenceType ?? null,
      referenceId: e.referenceId ?? null,
      debit: parseFloat(e.debit) || 0,
      credit: parseFloat(e.credit) || 0,
      lineItems:
        typeof e.lineItems === "string"
          ? e.lineItems
          : e.lineItems
            ? serializeLedgerLineItems(e.lineItems)
            : null,
    }))
    .filter((e) => e.accountId && (Math.abs(e.debit) > 0.001 || Math.abs(e.credit) > 0.001));

  if (!normalized.length) return [];

  const accountIds = [...new Set(normalized.map((e) => e.accountId))];
  const created = [];

  for (const entry of normalized) {
    const row = await tx.ledgerEntry.create({
      data: {
        accountId: entry.accountId,
        date: entry.date,
        description: entry.description,
        reference: entry.reference,
        referenceType: entry.referenceType,
        referenceId: entry.referenceId,
        debit: entry.debit,
        credit: entry.credit,
        balance: 0,
        lineItems: entry.lineItems ?? null,
      },
    });
    created.push(row);
  }

  await Promise.all(accountIds.map((id) => recomputeAndPersistAccountLedgerBalances(tx, id)));

  const refreshed = await tx.ledgerEntry.findMany({
    where: { id: { in: created.map((c) => c.id) } },
    orderBy: LEDGER_ENTRY_ORDER,
  });

  return refreshed;
}

/**
 * Create a double-entry journal with balanced debit/credit lines.
 */
export async function createJournalEntry(tx, {
  entryNumber,
  entryDate,
  description,
  referenceType,
  referenceId,
  lines,
  notes,
}) {
  const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (l.credit || 0), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`Journal entry unbalanced: debit=${totalDebit}, credit=${totalCredit}`);
  }

  const journal = await tx.journalEntry.create({
    data: {
      entryNumber,
      entryDate: entryDate || new Date(),
      description,
      referenceType,
      referenceId,
      totalDebit,
      totalCredit,
      status: "posted",
      notes,
      lines: {
        create: lines.map((l) => ({
          accountId: l.accountId,
          description: l.description,
          debit: l.debit || 0,
          credit: l.credit || 0,
        })),
      },
    },
  });

  await createLedgerEntries(
    tx,
    lines.map((line) => ({
      accountId: line.accountId,
      date: entryDate || new Date(),
      description: line.description || description,
      reference: entryNumber,
      referenceType: referenceType || "JournalEntry",
      referenceId: journal.id,
      debit: line.debit || 0,
      credit: line.credit || 0,
    }))
  );

  return journal;
}

/**
 * Get account balance by ID.
 */
export async function getAccountBalance(accountId) {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { balance: true },
  });
  return account?.balance || 0;
}

/**
 * Get ledger entries for an account with optional date range.
 */
export async function getAccountLedger(accountId, { from, to, limit } = {}) {
  const where = { accountId };
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(to);
  }

  return prisma.ledgerEntry.findMany({
    where,
    orderBy: LEDGER_ENTRY_ORDER,
    ...(limit != null ? { take: limit } : {}),
  });
}

/**
 * Sum outstanding balances by account category (raw net sum, signed).
 */
export async function getOutstandingByCategory(category) {
  const accounts = await prisma.account.findMany({
    where: { category, isActive: true },
    select: { balance: true },
  });
  return accounts.reduce((sum, a) => sum + a.balance, 0);
}

/**
 * Sum only the positive balances for a category — i.e. amounts owed TO the
 * business (customer/receivable-style accounts such as shops/companies,
 * where a debit on sale increases the balance).
 */
export async function getReceivablesByCategory(category) {
  const accounts = await prisma.account.findMany({
    where: { category, isActive: true },
    select: { balance: true },
  });
  return accounts.reduce((sum, a) => sum + Math.max(a.balance, 0), 0);
}

/**
 * Sum only the negative balances (flipped positive) for a category — i.e.
 * amounts the business owes OUT (vendor/payable-style accounts such as
 * supplier companies, where a credit on purchase decreases the balance).
 */
export async function getPayablesByCategory(category) {
  const accounts = await prisma.account.findMany({
    where: { category, isActive: true },
    select: { balance: true },
  });
  return accounts.reduce((sum, a) => sum + Math.max(-a.balance, 0), 0);
}

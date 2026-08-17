import prisma from "./prisma";

/** Oldest first — new entries appear at the bottom (statement / register order). */
export const LEDGER_ENTRY_ORDER = [{ date: "asc" }, { id: "asc" }];

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
}) {
  const [entry] = await createLedgerEntries(tx, [
    { accountId, date, description, reference, referenceType, referenceId, debit, credit },
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
    }))
    .filter((e) => e.accountId && (Math.abs(e.debit) > 0.001 || Math.abs(e.credit) > 0.001));

  if (!normalized.length) return [];

  const accountIds = [...new Set(normalized.map((e) => e.accountId))];
  const accounts = await tx.account.findMany({
    where: { id: { in: accountIds } },
    select: { id: true, balance: true },
  });
  const balanceById = Object.fromEntries(accounts.map((a) => [a.id, a.balance || 0]));

  for (const id of accountIds) {
    if (balanceById[id] === undefined) {
      throw new Error(`Account ${id} not found`);
    }
  }

  const rows = [];
  for (const entry of normalized) {
    const newBalance = balanceById[entry.accountId] + entry.debit - entry.credit;
    balanceById[entry.accountId] = newBalance;
    rows.push({
      accountId: entry.accountId,
      date: entry.date,
      description: entry.description,
      reference: entry.reference,
      referenceType: entry.referenceType,
      referenceId: entry.referenceId,
      debit: entry.debit,
      credit: entry.credit,
      balance: newBalance,
    });
  }

  await tx.ledgerEntry.createMany({ data: rows });

  await Promise.all(
    accountIds.map((id) =>
      tx.account.update({
        where: { id },
        data: { balance: balanceById[id] },
      })
    )
  );

  return rows;
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

  for (const line of lines) {
    await createLedgerEntry(tx, {
      accountId: line.accountId,
      date: entryDate || new Date(),
      description: line.description || description,
      reference: entryNumber,
      referenceType: referenceType || "JournalEntry",
      referenceId: journal.id,
      debit: line.debit || 0,
      credit: line.credit || 0,
    });
  }

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
 * farmers, where a credit on purchase decreases the balance).
 */
export async function getPayablesByCategory(category) {
  const accounts = await prisma.account.findMany({
    where: { category, isActive: true },
    select: { balance: true },
  });
  return accounts.reduce((sum, a) => sum + Math.max(-a.balance, 0), 0);
}

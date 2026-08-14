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
  const account = await tx.account.findUnique({ where: { id: accountId } });
  if (!account) throw new Error(`Account ${accountId} not found`);

  const entryDate = date ? new Date(date) : new Date();

  const newBalance = account.balance + debit - credit;

  const entry = await tx.ledgerEntry.create({
    data: {
      accountId,
      date: entryDate,
      description,
      reference,
      referenceType,
      referenceId,
      debit,
      credit,
      balance: newBalance,
    },
  });

  await tx.account.update({
    where: { id: accountId },
    data: { balance: newBalance },
  });

  return entry;
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

import prisma from "@/lib/prisma";

export async function attachCashAccountsToEmployees(employees) {
  const ids = [...new Set(employees.map((e) => e.cashAccountId).filter(Boolean))];
  if (!ids.length) return employees.map((e) => ({ ...e, cashAccount: null }));

  const accounts = await prisma.account.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, code: true, balance: true },
  });
  const byId = Object.fromEntries(accounts.map((a) => [a.id, a]));

  return employees.map((e) => ({
    ...e,
    cashAccount: e.cashAccountId ? byId[e.cashAccountId] || null : null,
  }));
}

export async function attachBankMetaToLedgerAccounts(accounts) {
  const ids = accounts.map((a) => a.id);
  if (!ids.length) return accounts.map((a) => ({ ...a, bankMeta: null }));

  const banks = await prisma.bankAccount.findMany({
    where: { ledgerAccountId: { in: ids } },
    select: {
      id: true,
      bankName: true,
      accountTitle: true,
      accountNumber: true,
      branchCode: true,
      branchName: true,
      isActive: true,
      ledgerAccountId: true,
    },
  });
  const byLedger = Object.fromEntries(banks.map((b) => [b.ledgerAccountId, b]));

  return accounts.map((a) => ({ ...a, bankMeta: byLedger[a.id] || null }));
}

export async function employeesByCashAccountIds(accountIds) {
  if (!accountIds?.length) return {};
  const employees = await prisma.employee.findMany({
    where: { cashAccountId: { in: accountIds } },
    select: { id: true, name: true, cashAccountId: true },
  });
  return Object.fromEntries(employees.map((e) => [e.cashAccountId, e]));
}

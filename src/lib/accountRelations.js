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

/** Attach farmer / company / shop / employee labels for All Accounts list. */
export async function attachPartyMetaToAccounts(accounts) {
  if (!accounts?.length) return [];

  const ids = accounts.map((a) => a.id);
  const [farmers, companies, shops, employees] = await Promise.all([
    prisma.farmer.findMany({
      where: { accountId: { in: ids } },
      select: { accountId: true, name: true, phone: true, city: true, village: true },
    }),
    prisma.company.findMany({
      where: { accountId: { in: ids } },
      select: {
        accountId: true,
        name: true,
        contactPerson: true,
        phone: true,
        city: true,
        companyType: true,
      },
    }),
    prisma.shop.findMany({
      where: { accountId: { in: ids } },
      select: { accountId: true, name: true, ownerName: true, phone: true, city: true, shopType: true },
    }),
    prisma.employee.findMany({
      where: { accountId: { in: ids } },
      select: { accountId: true, name: true, phone: true, role: true, department: true },
    }),
  ]);

  const metaByAccountId = {};
  for (const f of farmers) {
    metaByAccountId[f.accountId] = {
      kind: "farmer",
      name: f.name,
      subtitle: f.village ? `Village: ${f.village}` : null,
      phone: f.phone,
      city: f.city,
    };
  }
  for (const c of companies) {
    metaByAccountId[c.accountId] = {
      kind: "company",
      name: c.name,
      contactPerson: c.contactPerson,
      subtitle: c.contactPerson ? c.contactPerson : null,
      phone: c.phone,
      city: c.city,
      companyType: c.companyType,
    };
  }
  for (const s of shops) {
    metaByAccountId[s.accountId] = {
      kind: "shop",
      name: s.name,
      subtitle: s.ownerName ? `Owner: ${s.ownerName}` : null,
      phone: s.phone,
      city: s.city,
      shopType: s.shopType,
    };
  }
  for (const e of employees) {
    metaByAccountId[e.accountId] = {
      kind: "employee",
      name: e.name,
      subtitle: [e.role, e.department].filter(Boolean).join(" · ") || null,
      phone: e.phone,
    };
  }

  return accounts.map((a) => ({ ...a, party: metaByAccountId[a.id] || null }));
}

/** Load linked farmer / company / shop / employee / bank record for edit forms. */
export async function findPartyEntityByAccount(account) {
  if (!account?.id) return { partyEntity: null, bankMeta: null, entityId: null };

  const { id: accountId, category } = account;

  if (category === "farmer") {
    const entity = await prisma.farmer.findFirst({ where: { accountId } });
    return { partyEntity: entity, bankMeta: null, entityId: entity?.id ?? null };
  }
  if (category === "company") {
    const entity = await prisma.company.findFirst({ where: { accountId } });
    return { partyEntity: entity, bankMeta: null, entityId: entity?.id ?? null };
  }
  if (category === "shop") {
    const entity = await prisma.shop.findFirst({ where: { accountId } });
    return { partyEntity: entity, bankMeta: null, entityId: entity?.id ?? null };
  }
  if (category === "salary" || category === "transport") {
    const entity = await prisma.employee.findFirst({ where: { accountId } });
    return { partyEntity: entity, bankMeta: null, entityId: entity?.id ?? null };
  }
  if (category === "bank") {
    const bankMeta = await prisma.bankAccount.findFirst({ where: { ledgerAccountId: accountId } });
    return { partyEntity: null, bankMeta, entityId: bankMeta?.id ?? null };
  }

  return { partyEntity: null, bankMeta: null, entityId: null };
}

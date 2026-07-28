/** Roles that can see and use every cash/bank ledger account. */
export function canAccessAllCashAccounts(user) {
  if (!user) return false;
  return user.role === "admin" || user.role === "manager" || user.role === "accountant";
}

export function authUserId(user) {
  return user?.userId ?? user?.id ?? null;
}

/**
 * Prisma `where` clause for listing cash accounts for the current user.
 * Returns null when no extra filter (full access).
 */
export async function cashAccountWhereForUser(prisma, user) {
  if (canAccessAllCashAccounts(user)) return { category: "cash" };

  const uid = authUserId(user);
  if (!uid) return { id: -1 };

  const dbUser = await prisma.user.findUnique({
    where: { id: uid },
    select: { cashAccountId: true },
  });

  const or = [{ ownerUserId: uid }];
  if (dbUser?.cashAccountId) or.push({ id: dbUser.cashAccountId });

  return { category: "cash", OR: or };
}

export async function userCanAccessAccount(prisma, user, accountId) {
  if (!user || !accountId) return false;
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { category: true, ownerUserId: true },
  });
  if (!account) return false;
  if (account.category !== "cash") return true;
  if (canAccessAllCashAccounts(user)) return true;

  const uid = authUserId(user);
  if (account.ownerUserId === uid) return true;

  const dbUser = await prisma.user.findUnique({
    where: { id: uid },
    select: { cashAccountId: true },
  });
  return dbUser?.cashAccountId === accountId;
}

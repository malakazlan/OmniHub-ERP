/** Admin / finance roles can browse all cash accounts in the accounts directory (not for payments). */
export function canBrowseAllCashAccounts(user) {
  if (!user) return false;
  return user.role === "admin" || user.role === "manager" || user.role === "accountant";
}

/** @deprecated Use canBrowseAllCashAccounts — kept for existing imports. */
export const canAccessAllCashAccounts = canBrowseAllCashAccounts;

export function authUserId(user) {
  return user?.userId ?? user?.id ?? null;
}

/**
 * Cash accounts the user may select on sales, purchases, expenses, etc.
 * Every user (including admin) is limited to their assigned primary cash account.
 */
export async function cashAccountWhereForUser(prisma, user) {
  const uid = authUserId(user);
  if (!uid) return { id: -1 };

  const assignedId = user?.cashAccountId ? parseInt(user.cashAccountId, 10) : null;
  if (assignedId && Number.isFinite(assignedId)) {
    return { category: "cash", id: assignedId, isActive: true };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: uid },
    select: { cashAccountId: true },
  });

  if (dbUser?.cashAccountId) {
    return { category: "cash", id: dbUser.cashAccountId, isActive: true };
  }

  return { category: "cash", ownerUserId: uid, isActive: true };
}

/** Cash accounts visible in All Accounts directory listing. */
export async function cashAccountWhereForDirectory(prisma, user) {
  if (canBrowseAllCashAccounts(user)) {
    return { category: "cash" };
  }
  return cashAccountWhereForUser(prisma, user);
}

export async function userCanUseCashAccount(prisma, user, accountId) {
  if (!user || !accountId) return false;

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { category: true, ownerUserId: true, isActive: true },
  });
  if (!account || account.category !== "cash" || !account.isActive) return false;

  const uid = authUserId(user);
  if (account.ownerUserId === uid) return true;

  const dbUser = await prisma.user.findUnique({
    where: { id: uid },
    select: { cashAccountId: true },
  });
  return dbUser?.cashAccountId === accountId;
}

export async function userCanAccessAccount(prisma, user, accountId) {
  if (!user || !accountId) return false;

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { category: true, ownerUserId: true },
  });
  if (!account) return false;
  if (account.category !== "cash") return true;

  if (canBrowseAllCashAccounts(user)) return true;

  return userCanUseCashAccount(prisma, user, accountId);
}

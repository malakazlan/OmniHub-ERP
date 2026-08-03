import { userCanUseCashAccount } from "@/lib/accountAccess";

/** Validate admin-assigned primary cash account for a user login. */
export async function parseAssignedCashAccountId(prisma, cashAccountId, excludeUserId = null) {
  if (cashAccountId === null || cashAccountId === undefined || cashAccountId === "") {
    return null;
  }

  const id = parseInt(cashAccountId, 10);
  if (!Number.isFinite(id)) {
    throw new Error("Invalid cash account");
  }

  const account = await prisma.account.findFirst({
    where: { id, category: "cash", isActive: true },
  });
  if (!account) {
    throw new Error("Cash account not found or inactive");
  }

  const where = { cashAccountId: id };
  if (excludeUserId) where.id = { not: excludeUserId };

  const taken = await prisma.user.findFirst({ where, select: { name: true } });
  if (taken) {
    throw new Error(`This cash account is already assigned to ${taken.name}`);
  }

  return id;
}

/** Resolve user's assigned cash account when payment omits an explicit account. */
export async function resolveUserCashAccountId(prisma, userId, explicitId = null) {
  if (explicitId) {
    const id = parseInt(explicitId, 10);
    return Number.isFinite(id) ? id : null;
  }
  if (!userId) return null;
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { cashAccountId: true },
  });
  return dbUser?.cashAccountId ?? null;
}

/** Reject API requests that try to post cash to an account the user cannot use. */
export async function assertUserCanUseCashAccount(prisma, user, accountId) {
  if (!accountId) return;
  const id = parseInt(accountId, 10);
  if (!Number.isFinite(id)) {
    throw new Error("Invalid cash account");
  }
  const allowed = await userCanUseCashAccount(prisma, user, id);
  if (!allowed) {
    throw new Error("You can only use your assigned cash account");
  }
}

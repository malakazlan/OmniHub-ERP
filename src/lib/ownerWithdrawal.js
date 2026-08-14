/** Public ledger text — no private reason on general ledger. */
export const OWNER_WITHDRAWAL_LEDGER_TEXT = "Owner withdrawal";

const OWNER_DRAWINGS_CODE = "EQ-OWNER-DRAW";

export async function getOrCreateOwnerDrawingsAccount(tx) {
  const existing = await tx.account.findFirst({
    where: { code: OWNER_DRAWINGS_CODE },
  });
  if (existing) return existing;

  return tx.account.create({
    data: {
      name: "Owner Drawings",
      code: OWNER_DRAWINGS_CODE,
      type: "equity",
      category: "general",
      balance: 0,
      openingBalance: 0,
      isActive: true,
    },
  });
}

export async function assertWithdrawalSourceAccount(tx, accountId) {
  const id = parseInt(accountId, 10);
  if (!Number.isFinite(id)) throw new Error("Select a cash or bank account");

  const account = await tx.account.findFirst({
    where: { id, isActive: true, category: { in: ["cash", "bank"] } },
  });
  if (!account) throw new Error("Source account must be an active cash or bank ledger account");
  if (account.balance < 0) {
    /* allow — balance check happens at credit time */
  }
  return account;
}

import { generateAccountCode } from "@/lib/receipt";
import { applyOpeningBalance } from "@/lib/accountOpening";

/**
 * Create a cash ledger account inside an existing transaction.
 */
export async function createCashLedgerAccount(
  tx,
  { name, openingBalance = 0, openingBalanceDate, ownerUserId = null, phone = null }
) {
  const code = await generateAccountCode("cash", tx);

  const account = await tx.account.create({
    data: {
      name,
      code,
      type: "asset",
      category: "cash",
      phone: phone || null,
      openingBalance: 0,
      balance: 0,
      ownerUserId: ownerUserId ? parseInt(ownerUserId, 10) : null,
    },
  });

  await applyOpeningBalance(tx, account.id, "asset", openingBalance, openingBalanceDate);

  return tx.account.findUnique({ where: { id: account.id } });
}

export async function assignUserPrimaryCash(tx, userId, accountId) {
  if (!userId || !accountId) return;
  await tx.user.update({
    where: { id: parseInt(userId, 10) },
    data: { cashAccountId: parseInt(accountId, 10) },
  });
}

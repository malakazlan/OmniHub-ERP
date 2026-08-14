import { generateAccountCode } from "@/lib/receipt";

/**
 * Create a cash ledger account inside an existing transaction.
 */
export async function createCashLedgerAccount(tx, { name, openingBalance = 0, ownerUserId = null, phone = null }) {
  const code = await generateAccountCode("cash", tx);
  const opening = parseFloat(openingBalance) || 0;

  const account = await tx.account.create({
    data: {
      name,
      code,
      type: "asset",
      category: "cash",
      phone: phone || null,
      openingBalance: opening,
      balance: opening,
      ownerUserId: ownerUserId ? parseInt(ownerUserId, 10) : null,
    },
  });

  if (opening !== 0) {
    await tx.ledgerEntry.create({
      data: {
        accountId: account.id,
        date: new Date(),
        description: "Opening balance",
        debit: opening > 0 ? opening : 0,
        credit: opening < 0 ? Math.abs(opening) : 0,
        balance: opening,
      },
    });
  }

  return account;
}

export async function assignUserPrimaryCash(tx, userId, accountId) {
  if (!userId || !accountId) return;
  await tx.user.update({
    where: { id: parseInt(userId, 10) },
    data: { cashAccountId: parseInt(accountId, 10) },
  });
}

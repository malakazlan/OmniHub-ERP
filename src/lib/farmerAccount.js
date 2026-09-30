/** Farmer ledger accounts are customer/receivable (asset), not supplier payables. */
export const FARMER_ACCOUNT_TYPE = "asset";

/** Upgrade legacy farmer liability rows when touched (ledger semantics unchanged). */
export async function ensureFarmerAccountIsCustomerAsset(tx, accountId) {
  if (!accountId) return;
  const account = await tx.account.findUnique({
    where: { id: accountId },
    select: { id: true, category: true, type: true },
  });
  if (!account || account.category !== "farmer" || account.type === FARMER_ACCOUNT_TYPE) return;
  await tx.account.update({
    where: { id: account.id },
    data: { type: FARMER_ACCOUNT_TYPE },
  });
}

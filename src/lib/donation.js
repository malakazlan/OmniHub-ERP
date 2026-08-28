/** Public ledger label for donation entries. */
export const DONATION_LEDGER_PREFIX = "Donation";

const DONATIONS_EXPENSE_CODE = "EXP-DONATIONS";

export function buildDonationLedgerText(purpose, beneficiary) {
  const parts = [DONATION_LEDGER_PREFIX];
  if (purpose?.trim()) parts.push(purpose.trim());
  if (beneficiary?.trim()) parts.push(`to ${beneficiary.trim()}`);
  return parts.join(" — ");
}

export async function getOrCreateDonationsExpenseAccount(tx) {
  const existing = await tx.account.findFirst({
    where: { code: DONATIONS_EXPENSE_CODE },
  });
  if (existing) return existing;

  return tx.account.create({
    data: {
      name: "Charitable Donations",
      code: DONATIONS_EXPENSE_CODE,
      type: "expense",
      category: "expense",
      balance: 0,
      openingBalance: 0,
      isActive: true,
    },
  });
}

export async function assertDonationCashAccount(tx, accountId) {
  const id = parseInt(accountId, 10);
  if (!Number.isFinite(id)) throw new Error("Select a cash account");

  const account = await tx.account.findFirst({
    where: { id, isActive: true, category: "cash" },
  });
  if (!account) throw new Error("Donations must be paid from an active cash account");
  return account;
}

import {
  parseNum,
  computePaymentStatus,
  resolveDefaultCashAccountId,
  resolveDefaultBankAccountId,
} from "@/lib/order-processing";
import { createLedgerEntry } from "@/lib/ledger";
import { purchaseFreightDue } from "@/lib/purchaseFreightSettlement";

/** Post freight payment ledger legs tagged as Transport and update purchase totals. */
export async function applyFreightPaymentOnPurchase(
  tx,
  purchase,
  { cashDelta = 0, bankDelta = 0, paymentDate, notes }
) {
  const cash = parseNum(cashDelta);
  const bank = parseNum(bankDelta);
  const paidDelta = cash + bank;
  if (paidDelta <= 0) return {};

  if (!purchase.vendorAccountId) {
    throw new Error(`Vendor ledger account is missing on bill ${purchase.purchaseNumber}`);
  }

  const freightDue = purchaseFreightDue(purchase);
  if (paidDelta > freightDue + 0.01) {
    throw new Error(`Freight payment exceeds due on ${purchase.purchaseNumber}`);
  }

  const ref = purchase.purchaseNumber;
  const date = paymentDate || purchase.purchaseDate;
  const desc = notes?.trim()
    ? `Freight · ${ref} · ${notes.trim()}`
    : `Freight · ${ref}`;

  await createLedgerEntry(tx, {
    accountId: purchase.vendorAccountId,
    date,
    description: desc,
    reference: ref,
    referenceType: "Transport",
    referenceId: purchase.id,
    debit: paidDelta,
  });

  let cashAccountId = purchase.cashAccountId;
  let bankAccountId = purchase.bankAccountId;

  if (cash > 0) {
    cashAccountId = await resolveDefaultCashAccountId(tx, cashAccountId);
    if (!cashAccountId) throw new Error("Select a cash account for this payment");
    await createLedgerEntry(tx, {
      accountId: cashAccountId,
      date,
      description: `Cash freight · ${ref}`,
      reference: ref,
      referenceType: "Transport",
      referenceId: purchase.id,
      credit: cash,
    });
  }

  if (bank > 0) {
    bankAccountId = await resolveDefaultBankAccountId(tx, bankAccountId);
    if (!bankAccountId) throw new Error("Select a bank account for this payment");
    await createLedgerEntry(tx, {
      accountId: bankAccountId,
      date,
      description: `Bank freight · ${ref}`,
      reference: ref,
      referenceType: "Transport",
      referenceId: purchase.id,
      credit: bank,
    });
  }

  return { cashAccountId, bankAccountId };
}

export async function applyFreightPurchaseUpdate(tx, existing, alloc, paymentDate, notes, cashAccountId, bankAccountId) {
  const payTotal = alloc.cashAmount + alloc.bankAmount;
  const orderForLedger = {
    ...existing,
    cashAccountId: cashAccountId || existing.cashAccountId,
    bankAccountId: bankAccountId || existing.bankAccountId,
  };

  const resolved = await applyFreightPaymentOnPurchase(tx, orderForLedger, {
    cashDelta: alloc.cashAmount,
    bankDelta: alloc.bankAmount,
    paymentDate,
    notes,
  });

  const newCash = (existing.cashAmount || 0) + alloc.cashAmount;
  const newBank = (existing.bankAmount || 0) + alloc.bankAmount;
  const newPaid = (existing.paidAmount || 0) + payTotal;
  const newTransportPaid = Math.min(
    (existing.transportPaidAmount || 0) + payTotal,
    existing.transportCost || 0
  );
  const paymentStatus = computePaymentStatus(newPaid, existing.totalAmount);

  const updated = await tx.purchaseOrder.update({
    where: { id: existing.id },
    data: {
      cashAmount: newCash,
      bankAmount: newBank,
      paidAmount: newPaid,
      transportPaidAmount: newTransportPaid,
      paymentStatus,
      cashAccountId: resolved?.cashAccountId || cashAccountId || existing.cashAccountId,
      bankAccountId: resolved?.bankAccountId || bankAccountId || existing.bankAccountId,
    },
  });

  return updated;
}

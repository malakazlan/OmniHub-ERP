import { parseNum, computePaymentStatus } from "@/lib/order-processing";
import { createLedgerEntry } from "@/lib/ledger";
import { purchaseFreightDue } from "@/lib/purchaseFreightSettlement";

/** Deduct freight from vendor account (no cash/bank) and tag ledger as Transport. */
export async function applyFreightDeductionOnPurchase(
  tx,
  purchase,
  { amount = 0, paymentDate, notes, vendorAccountId }
) {
  const deduct = parseNum(amount);
  if (deduct <= 0) return;

  const accountId = purchase.vendorAccountId || vendorAccountId;
  if (!accountId) {
    throw new Error(`Vendor ledger account is missing on bill ${purchase.purchaseNumber}`);
  }

  const freightDue = purchaseFreightDue(purchase);
  if (deduct > freightDue + 0.01) {
    throw new Error(`Freight deduction exceeds due on ${purchase.purchaseNumber}`);
  }

  const ref = purchase.purchaseNumber;
  const date = paymentDate || purchase.purchaseDate;
  const desc = notes?.trim()
    ? `Freight deducted · ${ref} · ${notes.trim()}`
    : `Freight deducted · ${ref}`;

  await createLedgerEntry(tx, {
    accountId,
    date,
    description: desc,
    reference: ref,
    referenceType: "Transport",
    referenceId: purchase.id,
    debit: deduct,
  });
}

/** Standalone freight deduction when no purchase bill applies. */
export async function applyStandaloneFreightDeduction(
  tx,
  vendorAccountId,
  { amount = 0, paymentDate, notes }
) {
  const deduct = parseNum(amount);
  if (deduct <= 0) return;

  const date = paymentDate || new Date();
  const ref = notes?.trim() || "Freight";
  const desc = notes?.trim()
    ? `Freight deducted · ${notes.trim()}`
    : "Freight deducted";

  await createLedgerEntry(tx, {
    accountId: vendorAccountId,
    date,
    description: desc,
    reference: ref,
    referenceType: "Transport",
    referenceId: null,
    debit: deduct,
  });
}

export async function applyFreightPurchaseUpdate(
  tx,
  existing,
  alloc,
  paymentDate,
  notes,
  vendorAccountId
) {
  const deduct = alloc.amount;
  await applyFreightDeductionOnPurchase(tx, existing, {
    amount: deduct,
    paymentDate,
    notes,
    vendorAccountId,
  });

  const billRoom = Math.max((existing.totalAmount || 0) - (existing.paidAmount || 0), 0);
  const paidDelta = Math.min(deduct, billRoom);
  const newPaid = (existing.paidAmount || 0) + paidDelta;
  const newTransportPaid = Math.min(
    (existing.transportPaidAmount || 0) + deduct,
    existing.transportCost || 0
  );
  const paymentStatus = computePaymentStatus(newPaid, existing.totalAmount);

  const updated = await tx.purchaseOrder.update({
    where: { id: existing.id },
    data: {
      paidAmount: newPaid,
      transportPaidAmount: newTransportPaid,
      paymentStatus,
      vendorAccountId: existing.vendorAccountId || vendorAccountId,
    },
  });

  return updated;
}

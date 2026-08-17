import { parseNum, computePaymentStatus } from "@/lib/order-processing";
import { createLedgerEntry } from "@/lib/ledger";
import { purchaseFreightDue } from "@/lib/purchaseFreightSettlement";

/** Deduct freight from vendor account (no cash/bank) and tag ledger as Transport. */
export async function applyFreightDeductionOnPurchase(
  tx,
  purchase,
  { amount = 0, paymentDate, notes }
) {
  const deduct = parseNum(amount);
  if (deduct <= 0) return;

  if (!purchase.vendorAccountId) {
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
    accountId: purchase.vendorAccountId,
    date,
    description: desc,
    reference: ref,
    referenceType: "Transport",
    referenceId: purchase.id,
    debit: deduct,
  });
}

export async function applyFreightPurchaseUpdate(tx, existing, alloc, paymentDate, notes) {
  const deduct = alloc.amount;
  await applyFreightDeductionOnPurchase(tx, existing, {
    amount: deduct,
    paymentDate,
    notes,
  });

  const newPaid = (existing.paidAmount || 0) + deduct;
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
    },
  });

  return updated;
}

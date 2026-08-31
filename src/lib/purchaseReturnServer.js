import { createLedgerEntry } from "@/lib/ledger";
import {
  resolveDefaultCashAccountId,
  resolveDefaultBankAccountId,
} from "@/lib/order-processing";
import { parseNum, computePaymentStatus } from "@/lib/orderMath";
import {
  computeGrossPurchaseTotal,
  computeGrossPurchaseSubtotal,
  computeNetTotalsAfterReturns,
  computeMaxReturnRefund,
} from "@/lib/purchaseReturn";

export async function reconcilePurchaseOrderWithReturns(tx, purchaseId) {
  const purchase = await tx.purchaseOrder.findUnique({
    where: { id: purchaseId },
    include: { items: true, returns: true },
  });

  if (!purchase) return null;

  const totalReturned = purchase.returns.reduce((sum, row) => sum + parseNum(row.returnAmount), 0);
  const grossTotal = computeGrossPurchaseTotal(purchase, purchase.items);
  const grossSubtotal = computeGrossPurchaseSubtotal(purchase.items);
  const next = computeNetTotalsAfterReturns({
    grossTotal,
    grossSubtotal,
    totalReturned,
    paidAmount: purchase.paidAmount,
  });

  const needsUpdate =
    Math.abs(parseNum(purchase.totalAmount) - next.totalAmount) > 0.01 ||
    Math.abs(parseNum(purchase.subtotal) - next.subtotal) > 0.01 ||
    purchase.paymentStatus !== next.paymentStatus;

  if (!needsUpdate) return purchase;

  return tx.purchaseOrder.update({
    where: { id: purchaseId },
    data: {
      totalAmount: next.totalAmount,
      subtotal: next.subtotal,
      paymentStatus: next.paymentStatus,
    },
    include: { items: true, returns: true },
  });
}

export async function applyPurchaseReturnToOrder(tx, { purchase, purchaseItems }) {
  const existingReturns = await tx.purchaseReturn.findMany({
    where: { originalPurchaseId: purchase.id },
  });

  const totalReturned = existingReturns.reduce(
    (sum, row) => sum + parseNum(row.returnAmount),
    0
  );

  const grossTotal = computeGrossPurchaseTotal(purchase, purchaseItems);
  const grossSubtotal = computeGrossPurchaseSubtotal(purchaseItems);
  const next = computeNetTotalsAfterReturns({
    grossTotal,
    grossSubtotal,
    totalReturned,
    paidAmount: purchase.paidAmount,
  });

  return tx.purchaseOrder.update({
    where: { id: purchase.id },
    data: {
      totalAmount: next.totalAmount,
      subtotal: next.subtotal,
      paymentStatus: next.paymentStatus,
    },
  });
}

export async function applyPurchaseReturnRefund(
  tx,
  {
    purchase,
    purchaseReturn,
    returnDate,
    cashAmount,
    bankAmount,
    cashAccountId,
    bankAccountId,
    newTotalAmount,
  }
) {
  const cash = parseNum(cashAmount);
  const bank = parseNum(bankAmount);
  const refundTotal = cash + bank;
  if (refundTotal <= 0) return null;

  const maxRefund = computeMaxReturnRefund(purchase, purchaseReturn.returnAmount, newTotalAmount);
  if (refundTotal > maxRefund + 0.01) {
    throw new Error(
      `Refund cannot exceed ${maxRefund.toFixed(2)} (amount already paid on this bill after return)`
    );
  }

  if (!purchase.vendorAccountId) {
    throw new Error("Vendor ledger account is missing on this purchase");
  }

  const ref = purchaseReturn.returnNumber;

  if (cash > 0) {
    cashAccountId = await resolveDefaultCashAccountId(tx, cashAccountId);
    if (!cashAccountId) throw new Error("Select a cash account for this refund");
    await createLedgerEntry(tx, {
      accountId: cashAccountId,
      date: returnDate,
      description: `Cash refund on ${ref} · ${purchase.purchaseNumber}`,
      reference: ref,
      referenceType: "PurchaseReturn",
      referenceId: purchaseReturn.id,
      debit: cash,
    });
  }

  if (bank > 0) {
    bankAccountId = await resolveDefaultBankAccountId(tx, bankAccountId);
    if (!bankAccountId) throw new Error("Select a bank account for this refund");
    await createLedgerEntry(tx, {
      accountId: bankAccountId,
      date: returnDate,
      description: `Bank refund on ${ref} · ${purchase.purchaseNumber}`,
      reference: ref,
      referenceType: "PurchaseReturn",
      referenceId: purchaseReturn.id,
      debit: bank,
    });
  }

  await createLedgerEntry(tx, {
    accountId: purchase.vendorAccountId,
    date: returnDate,
    description: `Refund received ${ref} · ${purchase.purchaseNumber}`,
    reference: ref,
    referenceType: "PurchaseReturn",
    referenceId: purchaseReturn.id,
    credit: refundTotal,
  });

  const newCashAmount = Math.max(parseNum(purchase.cashAmount) - cash, 0);
  const newBankAmount = Math.max(parseNum(purchase.bankAmount) - bank, 0);
  const newPaidAmount = newCashAmount + newBankAmount;
  const paymentStatus = computePaymentStatus(newPaidAmount, newTotalAmount);

  await tx.purchaseReturn.update({
    where: { id: purchaseReturn.id },
    data: {
      refundCashAmount: cash,
      refundBankAmount: bank,
      refundCashAccountId: cash > 0 ? cashAccountId : null,
      refundBankAccountId: bank > 0 ? bankAccountId : null,
    },
  });

  return tx.purchaseOrder.update({
    where: { id: purchase.id },
    data: {
      cashAmount: newCashAmount,
      bankAmount: newBankAmount,
      paidAmount: newPaidAmount,
      paymentStatus,
    },
  });
}

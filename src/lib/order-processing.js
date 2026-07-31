import { createLedgerEntry } from "./ledger";

export function parseNum(val, fallback = 0) {
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : fallback;
}

export function computeItemSubtotal(items) {
  return items.reduce((sum, item) => {
    const qty = parseNum(item.quantity);
    const rate = parseNum(item.rate);
    const amount = item.amount !== undefined && item.amount !== null
      ? parseNum(item.amount)
      : qty * rate;
    return sum + amount;
  }, 0);
}

export function normalizeItems(items) {
  return items.map((item) => {
    const quantity = parseNum(item.quantity);
    const rate = parseNum(item.rate);
    const amount = item.amount !== undefined && item.amount !== null
      ? parseNum(item.amount)
      : quantity * rate;
    return {
      productId: parseInt(item.productId, 10),
      productName: item.productName || "",
      quantity,
      unit: item.unit || "bag",
      rate,
      amount,
    };
  });
}

export function computePaymentStatus(paidAmount, totalAmount) {
  if (paidAmount <= 0) return "unpaid";
  if (paidAmount >= totalAmount) return "paid";
  return "partial";
}

export function shouldApplyPurchaseEffects(status) {
  return status === "confirmed" || status === "received";
}

export function shouldApplySaleEffects(status) {
  return status === "confirmed" || status === "dispatched" || status === "delivered";
}

export async function resolveVendorAccountId(tx, { farmerId, companyId }) {
  if (farmerId) {
    const farmer = await tx.farmer.findUnique({
      where: { id: farmerId },
      select: { accountId: true },
    });
    return farmer?.accountId ?? null;
  }
  if (companyId) {
    const company = await tx.company.findUnique({
      where: { id: companyId },
      select: { accountId: true },
    });
    return company?.accountId ?? null;
  }
  return null;
}

export async function resolveCustomerAccountId(tx, { companyId, shopId }) {
  if (companyId) {
    const company = await tx.company.findUnique({
      where: { id: companyId },
      select: { accountId: true },
    });
    return company?.accountId ?? null;
  }
  if (shopId) {
    const shop = await tx.shop.findUnique({
      where: { id: shopId },
      select: { accountId: true },
    });
    return shop?.accountId ?? null;
  }
  return null;
}

export async function resolveDefaultCashAccountId(tx, preferredId = null) {
  if (preferredId) {
    const acc = await tx.account.findFirst({
      where: { id: preferredId, category: "cash", isActive: true },
    });
    if (acc) return acc.id;
  }
  const acc = await tx.account.findFirst({
    where: { category: "cash", isActive: true },
    orderBy: { id: "asc" },
  });
  return acc?.id ?? null;
}

export async function resolveDefaultBankAccountId(tx, preferredId = null) {
  if (preferredId) {
    const acc = await tx.account.findFirst({
      where: { id: preferredId, category: "bank", isActive: true },
    });
    if (acc) return acc.id;
  }
  const acc = await tx.account.findFirst({
    where: { category: "bank", isActive: true },
    orderBy: { id: "asc" },
  });
  return acc?.id ?? null;
}

/** Ensure cash/bank credits exist for purchase cashAmount/bankAmount (fixes missing legs). */
export async function syncPurchasePaymentLedgerLegs(tx, purchase) {
  const ref = purchase.purchaseNumber;
  const date = purchase.purchaseDate;
  let cashAccountId = purchase.cashAccountId;
  let bankAccountId = purchase.bankAccountId;
  const cashAmt = parseNum(purchase.cashAmount);
  const bankAmt = parseNum(purchase.bankAmount);

  if (cashAmt > 0) {
    cashAccountId = await resolveDefaultCashAccountId(tx, cashAccountId);
    if (!cashAccountId) {
      throw new Error("No active cash account — register one under All Accounts → Cash");
    }
    const posted = await tx.ledgerEntry.aggregate({
      where: {
        accountId: cashAccountId,
        reference: ref,
        referenceType: "PurchaseOrder",
        description: { contains: "Cash payment" },
      },
      _sum: { credit: true },
    });
    const gap = cashAmt - parseNum(posted._sum.credit);
    if (gap > 0.009) {
      await createLedgerEntry(tx, {
        accountId: cashAccountId,
        date,
        description: `Cash payment for ${ref}`,
        reference: ref,
        referenceType: "PurchaseOrder",
        referenceId: purchase.id,
        credit: gap,
      });
    }
  }

  if (bankAmt > 0) {
    bankAccountId = await resolveDefaultBankAccountId(tx, bankAccountId);
    if (!bankAccountId) {
      throw new Error("No active bank account — register one under All Accounts → Bank");
    }
    const posted = await tx.ledgerEntry.aggregate({
      where: {
        accountId: bankAccountId,
        reference: ref,
        referenceType: "PurchaseOrder",
        description: { contains: "Bank payment" },
      },
      _sum: { credit: true },
    });
    const gap = bankAmt - parseNum(posted._sum.credit);
    if (gap > 0.009) {
      await createLedgerEntry(tx, {
        accountId: bankAccountId,
        date,
        description: `Bank payment for ${ref}`,
        reference: ref,
        referenceType: "PurchaseOrder",
        referenceId: purchase.id,
        credit: gap,
      });
    }
  }

  return { cashAccountId: cashAmt > 0 ? cashAccountId : purchase.cashAccountId, bankAccountId: bankAmt > 0 ? bankAccountId : purchase.bankAccountId };
}

export async function applyPurchaseStockAndLedger(tx, purchase, items) {
  for (const item of items) {
    const product = await tx.product.findUnique({ where: { id: item.productId } });
    if (!product) throw new Error(`Product ${item.productId} not found`);

    const previousStock = product.currentStock;
    const newStock = previousStock + item.quantity;

    await tx.product.update({
      where: { id: item.productId },
      data: { currentStock: newStock },
    });

    await tx.stockMovement.create({
      data: {
        productId: item.productId,
        movementType: "purchase_in",
        quantity: item.quantity,
        previousStock,
        newStock,
        referenceType: "PurchaseOrder",
        referenceId: purchase.id,
        notes: `Purchase ${purchase.purchaseNumber}`,
      },
    });
  }

  if (purchase.vendorAccountId) {
    const ref = purchase.purchaseNumber;
    const { purchaseDate, totalAmount, paidAmount, cashAmount, bankAmount } = purchase;

    await createLedgerEntry(tx, {
      accountId: purchase.vendorAccountId,
      date: purchaseDate,
      description: `Purchase ${ref}`,
      reference: ref,
      referenceType: "PurchaseOrder",
      referenceId: purchase.id,
      credit: totalAmount,
    });

    if (paidAmount > 0) {
      await createLedgerEntry(tx, {
        accountId: purchase.vendorAccountId,
        date: purchaseDate,
        description: `Payment on ${ref}`,
        reference: ref,
        referenceType: "PurchaseOrder",
        referenceId: purchase.id,
        debit: paidAmount,
      });
    }

    const resolved = await syncPurchasePaymentLedgerLegs(tx, {
      ...purchase,
      purchaseDate,
      cashAmount,
      bankAmount,
    });

    return resolved;
  }

  return {};
}

/** Record additional payment on an already-confirmed purchase (ledger + PO totals). */
export async function applyPurchaseAdditionalPayment(tx, purchase, { cashDelta = 0, bankDelta = 0, paymentDate }) {
  const cash = parseNum(cashDelta);
  const bank = parseNum(bankDelta);
  const paidDelta = cash + bank;
  if (paidDelta <= 0) return;

  if (!purchase.vendorAccountId) {
    throw new Error("Vendor ledger account is missing on this purchase");
  }

  const ref = purchase.purchaseNumber;
  const date = paymentDate || purchase.purchaseDate;

  await createLedgerEntry(tx, {
    accountId: purchase.vendorAccountId,
    date,
    description: `Payment on ${ref}`,
    reference: ref,
    referenceType: "PurchaseOrder",
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
      description: `Cash payment for ${ref}`,
      reference: ref,
      referenceType: "PurchaseOrder",
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
      description: `Bank payment for ${ref}`,
      reference: ref,
      referenceType: "PurchaseOrder",
      referenceId: purchase.id,
      credit: bank,
    });
  }

  return { cashAccountId, bankAccountId };
}

export async function applySaleStockAndLedger(tx, sale, items) {
  for (const item of items) {
    const product = await tx.product.findUnique({ where: { id: item.productId } });
    if (!product) throw new Error(`Product ${item.productId} not found`);

    if (product.currentStock < item.quantity) {
      throw new Error(
        `Insufficient stock for ${product.name}. Available: ${product.currentStock}, requested: ${item.quantity}`
      );
    }

    const previousStock = product.currentStock;
    const newStock = previousStock - item.quantity;

    await tx.product.update({
      where: { id: item.productId },
      data: { currentStock: newStock },
    });

    await tx.stockMovement.create({
      data: {
        productId: item.productId,
        movementType: "sale_out",
        quantity: item.quantity,
        previousStock,
        newStock,
        referenceType: "SaleOrder",
        referenceId: sale.id,
        notes: `Sale ${sale.invoiceNumber}`,
      },
    });
  }

  if (sale.customerAccountId) {
    const ref = sale.invoiceNumber;
    const { saleDate, totalAmount, paidAmount, cashAmount, bankAmount } = sale;

    await createLedgerEntry(tx, {
      accountId: sale.customerAccountId,
      date: saleDate,
      description: `Sale ${ref}`,
      reference: ref,
      referenceType: "SaleOrder",
      referenceId: sale.id,
      debit: totalAmount,
    });

    if (paidAmount > 0) {
      await createLedgerEntry(tx, {
        accountId: sale.customerAccountId,
        date: saleDate,
        description: `Payment on ${ref}`,
        reference: ref,
        referenceType: "SaleOrder",
        referenceId: sale.id,
        credit: paidAmount,
      });
    }

    if (cashAmount > 0 && sale.cashAccountId) {
      await createLedgerEntry(tx, {
        accountId: sale.cashAccountId,
        date: saleDate,
        description: `Cash received for ${ref}`,
        reference: ref,
        referenceType: "SaleOrder",
        referenceId: sale.id,
        debit: cashAmount,
      });
    }

    if (bankAmount > 0 && sale.bankAccountId) {
      await createLedgerEntry(tx, {
        accountId: sale.bankAccountId,
        date: saleDate,
        description: `Bank received for ${ref}`,
        reference: ref,
        referenceType: "SaleOrder",
        referenceId: sale.id,
        debit: bankAmount,
      });
    }
  }
}

import { createLedgerEntry, serializeLedgerLineItems } from "./ledger";
import { FARMER_ACCOUNT_TYPE, ensureFarmerAccountIsCustomerAsset } from "./farmerAccount";
import { generateAccountCode } from "./receipt";
import {
  parseNum,
  computeItemSubtotal,
  normalizeItems,
  computePaymentStatus,
  shouldApplyPurchaseEffects,
  shouldApplySaleEffects,
} from "./orderMath";

export {
  parseNum,
  computeItemSubtotal,
  normalizeItems,
  computePaymentStatus,
  shouldApplyPurchaseEffects,
  shouldApplySaleEffects,
} from "./orderMath";

async function accountExists(tx, accountId) {
  if (!accountId) return false;
  const account = await tx.account.findUnique({
    where: { id: accountId },
    select: { id: true },
  });
  return Boolean(account);
}

async function ensureFarmerLedgerAccount(tx, farmerId) {
  const farmer = await tx.farmer.findUnique({ where: { id: farmerId } });
  if (!farmer) return null;

  if (farmer.accountId && (await accountExists(tx, farmer.accountId))) {
    await ensureFarmerAccountIsCustomerAsset(tx, farmer.accountId);
    return farmer.accountId;
  }

  const code = await generateAccountCode("farmer", tx);
  const account = await tx.account.create({
    data: {
      name: farmer.name,
      code,
      type: FARMER_ACCOUNT_TYPE,
      category: "farmer",
      city: farmer.city,
      phone: farmer.phone,
      whatsappNumber: farmer.whatsappNumber,
      cnic: farmer.cnic,
      address: farmer.address,
    },
  });

  await tx.farmer.update({
    where: { id: farmerId },
    data: { accountId: account.id },
  });

  return account.id;
}

async function ensureCompanyLedgerAccount(tx, companyId, { forPurchase = false } = {}) {
  const company = await tx.company.findUnique({ where: { id: companyId } });
  if (!company) return null;

  if (company.accountId && (await accountExists(tx, company.accountId))) {
    return company.accountId;
  }

  const code = await generateAccountCode("company", tx);
  const accountType =
    forPurchase || company.companyType === "supplier" ? "liability" : "asset";

  const account = await tx.account.create({
    data: {
      name: company.name,
      code,
      type: accountType,
      category: "company",
      city: company.city,
      phone: company.phone,
      whatsappNumber: company.whatsappNumber,
      address: company.address,
    },
  });

  await tx.company.update({
    where: { id: companyId },
    data: { accountId: account.id },
  });

  return account.id;
}

async function ensureShopLedgerAccount(tx, shopId) {
  const shop = await tx.shop.findUnique({ where: { id: shopId } });
  if (!shop) return null;

  if (shop.accountId && (await accountExists(tx, shop.accountId))) {
    return shop.accountId;
  }

  const code = await generateAccountCode("shop", tx);
  const account = await tx.account.create({
    data: {
      name: shop.name,
      code,
      type: "asset",
      category: "shop",
      city: shop.city,
      phone: shop.phone,
      whatsappNumber: shop.whatsappNumber,
      address: shop.address,
    },
  });

  await tx.shop.update({
    where: { id: shopId },
    data: { accountId: account.id },
  });

  return account.id;
}

export async function resolveVendorAccountId(tx, { farmerId, companyId }) {
  if (farmerId) {
    return ensureFarmerLedgerAccount(tx, farmerId);
  }
  if (companyId) {
    return ensureCompanyLedgerAccount(tx, companyId, { forPurchase: true });
  }
  return null;
}

export async function resolveCustomerAccountId(tx, { companyId, shopId, farmerId }) {
  if (farmerId) {
    return ensureFarmerLedgerAccount(tx, farmerId);
  }
  if (companyId) {
    return ensureCompanyLedgerAccount(tx, companyId, { forPurchase: false });
  }
  if (shopId) {
    return ensureShopLedgerAccount(tx, shopId);
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

  // Legs reversed by a bill correction no longer count as posted, otherwise
  // the re-post after a correction finds "no gap" and the cash/bank credit is lost.
  const lastCorrection = await tx.ledgerEntry.findFirst({
    where: { referenceType: "PurchaseCorrection", referenceId: purchase.id },
    orderBy: { id: "desc" },
    select: { id: true },
  });
  const activeOnly = lastCorrection ? { id: { gt: lastCorrection.id } } : {};

  if (cashAmt > 0) {
    cashAccountId = await resolveDefaultCashAccountId(tx, cashAccountId);
    if (!cashAccountId) {
      throw new Error("No active cash account — register one under Chart of Accounts → Cash");
    }
    const posted = await tx.ledgerEntry.aggregate({
      where: {
        accountId: cashAccountId,
        reference: ref,
        referenceType: "PurchaseOrder",
        description: { contains: "Cash payment" },
        ...activeOnly,
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
      throw new Error("No active bank account — register one under Chart of Accounts → Bank");
    }
    const posted = await tx.ledgerEntry.aggregate({
      where: {
        accountId: bankAccountId,
        reference: ref,
        referenceType: "PurchaseOrder",
        description: { contains: "Bank payment" },
        ...activeOnly,
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
    if (!product) throw new Error(`Item ${item.productId} not found`);

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
    const { purchaseDate, totalAmount, cashAmount, bankAmount } = purchase;
    // Only the bill's own cash/bank split is posted here; amounts settled by
    // standalone payments (FIFO) already have their own ledger entries.
    const inlinePaid = parseNum(cashAmount) + parseNum(bankAmount);

    await createLedgerEntry(tx, {
      accountId: purchase.vendorAccountId,
      date: purchaseDate,
      description: `Purchase ${ref}`,
      reference: ref,
      referenceType: "PurchaseOrder",
      referenceId: purchase.id,
      credit: totalAmount,
      lineItems: serializeLedgerLineItems(items),
    });

    if (inlinePaid > 0) {
      await createLedgerEntry(tx, {
        accountId: purchase.vendorAccountId,
        date: purchaseDate,
        description: `Payment on ${ref}`,
        reference: ref,
        referenceType: "PurchaseOrder",
        referenceId: purchase.id,
        debit: inlinePaid,
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
    if (!product) throw new Error(`Item ${item.productId} not found`);

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

  const ref = sale.invoiceNumber;
  const { saleDate, cashAmount, bankAmount, totalAmount } = sale;
  // Only the invoice's own cash/bank split is posted here; amounts settled by
  // standalone receipts (FIFO) already have their own ledger entries.
  const inlinePaid = parseNum(cashAmount) + parseNum(bankAmount);

  if (sale.customerAccountId) {
    await createLedgerEntry(tx, {
      accountId: sale.customerAccountId,
      date: saleDate,
      description: `Sale ${ref}`,
      reference: ref,
      referenceType: "SaleOrder",
      referenceId: sale.id,
      debit: totalAmount,
      lineItems: serializeLedgerLineItems(items),
    });

    if (inlinePaid > 0) {
      await createLedgerEntry(tx, {
        accountId: sale.customerAccountId,
        date: saleDate,
        description: `Payment on ${ref}`,
        reference: ref,
        referenceType: "SaleOrder",
        referenceId: sale.id,
        credit: inlinePaid,
      });
    }
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

function parseNum(val, fallback = 0) {
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : fallback;
}

export const VENDOR_ACCOUNT_CATEGORIES = new Set(["farmer", "company", "shop"]);
export const CUSTOMER_ACCOUNT_CATEGORIES = new Set(["shop", "company"]);

const PURCHASE_OPEN = {
  status: { in: ["confirmed", "received"] },
  paymentStatus: { in: ["unpaid", "partial"] },
};

const SALE_OPEN = {
  status: { in: ["confirmed", "dispatched", "delivered"] },
  paymentStatus: { in: ["unpaid", "partial"] },
};

const PURCHASE_ORDER = [{ purchaseDate: "asc" }, { id: "asc" }];
const SALE_ORDER = [{ saleDate: "asc" }, { id: "asc" }];

export function sortPurchasesOldestFirst(purchases) {
  return [...purchases].sort((a, b) => {
    const da = new Date(a.purchaseDate).getTime();
    const db = new Date(b.purchaseDate).getTime();
    if (da !== db) return da - db;
    return a.id - b.id;
  });
}

export function sortSalesOldestFirst(sales) {
  return [...sales].sort((a, b) => {
    const da = new Date(a.saleDate).getTime();
    const db = new Date(b.saleDate).getTime();
    if (da !== db) return da - db;
    return a.id - b.id;
  });
}

export function purchaseBalanceDue(purchase) {
  return Math.max((purchase.totalAmount || 0) - (purchase.paidAmount || 0), 0);
}

export function saleBalanceDue(sale) {
  return Math.max((sale.totalAmount || 0) - (sale.paidAmount || 0), 0);
}

export function totalOutstandingDue(purchases) {
  return purchases.reduce((sum, p) => sum + purchaseBalanceDue(p), 0);
}

/** Find open purchase bills for a ledger account (vendorAccountId or farmer/company link). */
export async function findOutstandingPurchasesForLedgerAccount(db, accountId) {
  const byVendor = await db.purchaseOrder.findMany({
    where: { ...PURCHASE_OPEN, vendorAccountId: accountId },
    orderBy: PURCHASE_ORDER,
  });
  if (byVendor.length > 0) return byVendor;

  const account = await db.account.findUnique({
    where: { id: accountId },
    select: { category: true },
  });
  if (!account) return [];

  if (account.category === "farmer") {
    const farmer = await db.farmer.findFirst({
      where: { accountId },
      select: { id: true },
    });
    if (farmer) {
      return db.purchaseOrder.findMany({
        where: { ...PURCHASE_OPEN, farmerId: farmer.id },
        orderBy: PURCHASE_ORDER,
      });
    }
  }

  if (account.category === "company") {
    const company = await db.company.findFirst({
      where: { accountId },
      select: { id: true },
    });
    if (company) {
      return db.purchaseOrder.findMany({
        where: { ...PURCHASE_OPEN, companyId: company.id },
        orderBy: PURCHASE_ORDER,
      });
    }
  }

  return [];
}

/** Find open sale invoices for a ledger account (customerAccountId or shop/company link). */
export async function findOutstandingSalesForLedgerAccount(db, accountId) {
  const byCustomer = await db.saleOrder.findMany({
    where: { ...SALE_OPEN, customerAccountId: accountId },
    orderBy: SALE_ORDER,
  });
  if (byCustomer.length > 0) return byCustomer;

  const account = await db.account.findUnique({
    where: { id: accountId },
    select: { category: true },
  });
  if (!account) return [];

  if (account.category === "shop") {
    const shop = await db.shop.findFirst({
      where: { accountId },
      select: { id: true },
    });
    if (shop) {
      return db.saleOrder.findMany({
        where: { ...SALE_OPEN, shopId: shop.id },
        orderBy: SALE_ORDER,
      });
    }
  }

  if (account.category === "company") {
    const company = await db.company.findFirst({
      where: { accountId },
      select: { id: true },
    });
    if (company) {
      return db.saleOrder.findMany({
        where: { ...SALE_OPEN, companyId: company.id },
        orderBy: SALE_ORDER,
      });
    }
  }

  return [];
}

/** Allocate a single payment amount across bills oldest-first (FIFO). */
export function planFifoPurchaseSettlement(purchases, cashAmount, bankAmount) {
  let remainingCash = parseNum(cashAmount);
  let remainingBank = parseNum(bankAmount);
  const allocations = [];

  for (const purchase of sortPurchasesOldestFirst(purchases)) {
    const balance = purchaseBalanceDue(purchase);
    if (balance <= 0) continue;

    let need = balance;
    const cashApply = Math.min(remainingCash, need);
    need -= cashApply;
    remainingCash -= cashApply;

    const bankApply = Math.min(remainingBank, need);
    need -= bankApply;
    remainingBank -= bankApply;

    const applied = cashApply + bankApply;
    if (applied > 0) {
      allocations.push({
        purchaseId: purchase.id,
        purchaseNumber: purchase.purchaseNumber,
        purchaseDate: purchase.purchaseDate,
        balanceDue: balance,
        cashAmount: cashApply,
        bankAmount: bankApply,
        amount: applied,
        clearsFully: applied >= balance - 0.001,
      });
    }

    if (remainingCash + remainingBank <= 0.001) break;
  }

  const totalPayment = parseNum(cashAmount) + parseNum(bankAmount);
  const totalApplied = allocations.reduce((sum, a) => sum + a.amount, 0);

  return {
    allocations,
    totalApplied,
    unapplied: Math.max(totalPayment - totalApplied, 0),
  };
}

export function planFifoSaleSettlement(sales, amount) {
  let remaining = parseNum(amount);
  const allocations = [];

  for (const sale of sortSalesOldestFirst(sales)) {
    const balance = saleBalanceDue(sale);
    if (balance <= 0) continue;

    const apply = Math.min(remaining, balance);
    if (apply <= 0) break;

    remaining -= apply;
    allocations.push({
      saleId: sale.id,
      invoiceNumber: sale.invoiceNumber,
      saleDate: sale.saleDate,
      balanceDue: balance,
      amount: apply,
      clearsFully: apply >= balance - 0.001,
    });

    if (remaining <= 0.001) break;
  }

  const totalApplied = allocations.reduce((sum, a) => sum + a.amount, 0);
  return {
    allocations,
    totalApplied,
    unapplied: Math.max(parseNum(amount) - totalApplied, 0),
  };
}

export function formatPurchaseClearSummary(allocations) {
  if (!allocations?.length) return "";
  const parts = allocations.map((a) => {
    const label = a.clearsFully ? "paid" : "partial";
    return `${a.purchaseNumber} (${label} ${a.amount.toFixed(2)})`;
  });
  return `Bills cleared: ${parts.join(", ")}`;
}

export function formatSaleClearSummary(allocations) {
  if (!allocations?.length) return "";
  const parts = allocations.map((a) => {
    const label = a.clearsFully ? "paid" : "partial";
    return `${a.invoiceNumber} (${label} ${a.amount.toFixed(2)})`;
  });
  return `Invoices cleared: ${parts.join(", ")}`;
}

export async function applyPurchaseAllocations(tx, allocations, ledgerAccountId, computeStatus) {
  const cleared = [];
  for (const alloc of allocations) {
    const existing = await tx.purchaseOrder.findUnique({ where: { id: alloc.purchaseId } });
    if (!existing) continue;

    const apply = alloc.amount ?? alloc.cashAmount + alloc.bankAmount;
    const newPaid = (existing.paidAmount || 0) + apply;
    const paymentStatus = computeStatus(newPaid, existing.totalAmount);

    await tx.purchaseOrder.update({
      where: { id: alloc.purchaseId },
      data: {
        paidAmount: newPaid,
        paymentStatus,
        vendorAccountId: existing.vendorAccountId || ledgerAccountId,
      },
    });

    cleared.push({
      id: existing.id,
      purchaseNumber: existing.purchaseNumber,
      amount: apply,
      paymentStatus,
      clearsFully: alloc.clearsFully,
    });
  }
  return cleared;
}

export async function applySaleAllocations(tx, allocations, ledgerAccountId, computeStatus) {
  const cleared = [];
  for (const alloc of allocations) {
    const existing = await tx.saleOrder.findUnique({ where: { id: alloc.saleId } });
    if (!existing) continue;

    const apply = alloc.amount;
    const newPaid = (existing.paidAmount || 0) + apply;
    const paymentStatus = computeStatus(newPaid, existing.totalAmount);

    await tx.saleOrder.update({
      where: { id: alloc.saleId },
      data: {
        paidAmount: newPaid,
        paymentStatus,
        customerAccountId: existing.customerAccountId || ledgerAccountId,
      },
    });

    cleared.push({
      id: existing.id,
      invoiceNumber: existing.invoiceNumber,
      amount: apply,
      paymentStatus,
      clearsFully: alloc.clearsFully,
    });
  }
  return cleared;
}

/** @deprecated use find + plan + apply */
export async function markPurchaseBillsPaidFifo(tx, vendorAccountId, amount, computeStatus) {
  const purchases = await findOutstandingPurchasesForLedgerAccount(tx, vendorAccountId);
  const plan = planFifoPurchaseSettlement(purchases, amount, 0);
  return applyPurchaseAllocations(tx, plan.allocations, vendorAccountId, computeStatus);
}

/** @deprecated use find + plan + apply */
export async function markSaleInvoicesPaidFifo(tx, customerAccountId, amount, computeStatus) {
  const sales = await findOutstandingSalesForLedgerAccount(tx, customerAccountId);
  const plan = planFifoSaleSettlement(sales, amount);
  return applySaleAllocations(tx, plan.allocations, customerAccountId, computeStatus);
}

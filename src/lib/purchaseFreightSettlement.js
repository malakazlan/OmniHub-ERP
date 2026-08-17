function parseNum(val, fallback = 0) {
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : fallback;
}

const PURCHASE_ACTIVE = { status: { in: ["confirmed", "received"] } };
const PURCHASE_ORDER = [{ purchaseDate: "asc" }, { id: "asc" }];

/** Freight still to deduct = transport cost minus already freight-deducted. */
export function purchaseFreightDue(purchase) {
  const transportCost = purchase.transportCost || 0;
  if (transportCost <= 0) return 0;
  const transportPaid = purchase.transportPaidAmount || 0;
  return Math.max(transportCost - transportPaid, 0);
}

export function sortPurchasesOldestFirst(purchases) {
  return [...purchases].sort((a, b) => {
    const da = new Date(a.purchaseDate).getTime();
    const db = new Date(b.purchaseDate).getTime();
    if (da !== db) return da - db;
    return a.id - b.id;
  });
}

async function findPurchasesForLedgerAccount(db, accountId) {
  const byVendor = await db.purchaseOrder.findMany({
    where: { ...PURCHASE_ACTIVE, vendorAccountId: accountId },
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
        where: { ...PURCHASE_ACTIVE, farmerId: farmer.id },
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
        where: { ...PURCHASE_ACTIVE, companyId: company.id },
        orderBy: PURCHASE_ORDER,
      });
    }
  }

  return [];
}

/** Confirmed/received purchases for account that still have transport freight to deduct. */
export async function findPurchasesWithFreightDueForLedgerAccount(db, accountId) {
  const purchases = await findPurchasesForLedgerAccount(db, accountId);
  return purchases.filter((p) => purchaseFreightDue(p) > 0);
}

/** Allocate freight deduction across bills oldest-first (FIFO). */
export function planFifoFreightSettlement(purchases, amount) {
  let remaining = parseNum(amount);
  const allocations = [];

  for (const purchase of sortPurchasesOldestFirst(purchases)) {
    const balance = purchaseFreightDue(purchase);
    if (balance <= 0) continue;

    const applied = Math.min(remaining, balance);
    if (applied > 0) {
      allocations.push({
        purchaseId: purchase.id,
        purchaseNumber: purchase.purchaseNumber,
        purchaseDate: purchase.purchaseDate,
        transportCost: purchase.transportCost || 0,
        freightDue: balance,
        amount: applied,
        clearsFreightFully: applied >= balance - 0.001,
      });
      remaining -= applied;
    }

    if (remaining <= 0.001) break;
  }

  const totalDeduction = parseNum(amount);
  const totalApplied = allocations.reduce((sum, a) => sum + a.amount, 0);

  return {
    allocations,
    totalApplied,
    unapplied: Math.max(totalDeduction - totalApplied, 0),
  };
}

export function totalFreightOutstanding(purchases) {
  return purchases.reduce((sum, p) => sum + purchaseFreightDue(p), 0);
}

export function formatFreightClearSummary(allocations) {
  if (!allocations?.length) return "";
  const parts = allocations.map((a) => {
    const label = a.clearsFreightFully ? "freight cleared" : "partial freight";
    return `${a.purchaseNumber} (${label} ${a.amount.toFixed(2)})`;
  });
  return parts.join(", ");
}

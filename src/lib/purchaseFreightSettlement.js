function parseNum(val, fallback = 0) {
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : fallback;
}

export function purchaseFreightDue(purchase) {
  const transportCost = purchase.transportCost || 0;
  if (transportCost <= 0) return 0;
  const transportPaid = purchase.transportPaidAmount || 0;
  const freightRemaining = Math.max(transportCost - transportPaid, 0);
  const billBalance = Math.max((purchase.totalAmount || 0) - (purchase.paidAmount || 0), 0);
  return Math.min(freightRemaining, billBalance);
}

export function sortPurchasesOldestFirst(purchases) {
  return [...purchases].sort((a, b) => {
    const da = new Date(a.purchaseDate).getTime();
    const db = new Date(b.purchaseDate).getTime();
    if (da !== db) return da - db;
    return a.id - b.id;
  });
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

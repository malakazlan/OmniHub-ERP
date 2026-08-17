export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function advanceBalance(advance) {
  return Math.max((advance.amount || 0) - (advance.settledAmount || 0), 0);
}

function advanceRow(adv) {
  return {
    id: adv.id,
    advanceDate: adv.advanceDate,
    amount: adv.amount || 0,
    settledAmount: adv.settledAmount || 0,
    balance: advanceBalance(adv),
    status: adv.status || "pending",
    notes: adv.notes || "",
  };
}

/** Advance created when clearing salary — paid out, not part of "this month taken" table. */
export function isClearanceAdvance(adv) {
  return String(adv?.notes || "").toLowerCase().includes("clearance");
}

/** Detailed advance ledger for salary slip (previous vs this month, with dates). */
export function buildAdvanceReceiptDetail(
  advances = [],
  month,
  year,
  { advanceDeduction = 0, newAdvanceOnClearance = 0 } = {}
) {
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  const monthStart = new Date(y, m - 1, 1);
  const monthEnd = new Date(y, m, 0, 23, 59, 59, 999);

  const previousRows = [];
  const monthRows = [];
  const clearanceRows = [];
  let previousBalance = 0;
  let monthGross = 0;

  for (const adv of advances) {
    const date = new Date(adv.advanceDate);
    const row = advanceRow(adv);
    const clearance = isClearanceAdvance(adv);

    if (clearance) {
      if (date >= monthStart && date <= monthEnd) {
        clearanceRows.push(row);
      }
      continue;
    }

    if (date >= monthStart && date <= monthEnd) {
      monthRows.push(row);
      monthGross += row.amount;
    } else if (date < monthStart && row.balance > 0) {
      previousRows.push(row);
      previousBalance += row.balance;
    }
  }

  const deducted = Math.max(parseFloat(advanceDeduction) || 0, 0);
  const clearanceFromRows = clearanceRows.reduce((s, r) => s + r.amount, 0);
  const newOnClearance =
    Math.max(parseFloat(newAdvanceOnClearance) || 0, 0) || clearanceFromRows;

  const monthUnsettled = monthRows.reduce((s, r) => s + r.balance, 0);
  const clearanceUnsettled = clearanceRows.reduce((s, r) => s + r.balance, 0);
  const openingOwed = previousBalance + monthGross;

  const pendingFromBalances = previousBalance + monthUnsettled + clearanceUnsettled;
  const pendingAfterClearance =
    clearanceRows.length > 0 || clearanceUnsettled > 0
      ? pendingFromBalances
      : Math.max(0, openingOwed - deducted) + newOnClearance;

  const totalPending = advances.reduce((s, a) => s + advanceBalance(a), 0);

  return {
    previousRows,
    monthRows,
    clearanceRows,
    previousBalance,
    monthGross,
    monthUnsettled,
    openingOwed,
    deducted,
    newOnClearance,
    totalOpening: openingOwed,
    totalPending,
    pendingAfterClearance,
  };
}

/** Advance columns for salary register: prior balance, this month, pending. */
export function buildSalaryAdvanceSummary(advances = [], month, year, advanceDeduction = 0) {
  const detail = buildAdvanceReceiptDetail(advances, month, year, { advanceDeduction });

  return {
    previousBalance: detail.previousBalance,
    monthAdvanceTotal: detail.monthGross,
    advanceDeduction: detail.deducted,
    pendingBalance: detail.pendingAfterClearance,
    previousRows: detail.previousRows,
    monthRows: detail.monthRows,
    clearanceRows: detail.clearanceRows,
    detail,
  };
}

export function sumPendingAdvances(advances = []) {
  return advances
    .filter((a) => a.status !== "settled")
    .reduce((sum, a) => sum + advanceBalance(a), 0);
}

export async function getPendingAdvancesForEmployee(db, employeeId) {
  return db.salaryAdvance.findMany({
    where: {
      employeeId,
      status: { in: ["pending", "partial"] },
    },
    orderBy: [{ advanceDate: "asc" }, { id: "asc" }],
  });
}

export async function getPendingAdvanceTotal(db, employeeId) {
  const rows = await getPendingAdvancesForEmployee(db, employeeId);
  return sumPendingAdvances(rows);
}

/** Settle advances oldest-first against a salary deduction amount. Returns amounts applied per advance. */
export async function settleAdvancesForSalary(tx, employeeId, deductAmount, salaryRecordId) {
  let remaining = deductAmount;
  if (remaining <= 0) return [];

  const advances = await tx.salaryAdvance.findMany({
    where: { employeeId, status: { in: ["pending", "partial"] } },
    orderBy: [{ advanceDate: "asc" }, { id: "asc" }],
  });

  const settlements = [];
  const updates = [];
  for (const adv of advances) {
    if (remaining <= 0.001) break;
    if (isClearanceAdvance(adv)) continue;
    const due = advanceBalance(adv);
    if (due <= 0) continue;
    const apply = Math.min(due, remaining);
    const newSettled = (adv.settledAmount || 0) + apply;
    const status = newSettled >= (adv.amount || 0) - 0.001 ? "settled" : "partial";
    settlements.push({ advanceId: adv.id, amount: apply });
    updates.push(
      tx.salaryAdvance.update({
        where: { id: adv.id },
        data: { settledAmount: newSettled, status },
      })
    );
    remaining -= apply;
  }

  if (updates.length) await Promise.all(updates);

  if (salaryRecordId && settlements.length > 0) {
    await tx.salaryRecord.update({
      where: { id: salaryRecordId },
      data: { advanceDeduction: deductAmount - remaining },
    });
  }

  return settlements;
}

export async function getPendingCommissionTotal(db, employeeId, month, year) {
  const rows = await db.employeeCommission.findMany({
    where: {
      employeeId,
      month: parseInt(month, 10),
      year: parseInt(year, 10),
      status: "pending",
    },
  });
  return rows.reduce((sum, r) => sum + (r.commissionAmount || 0), 0);
}

/** Build commission rows from confirmed sales linked via employee.userId. */
export async function syncCommissionsFromSales(db, month, year) {
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0, 23, 59, 59);

  const employees = await db.employee.findMany({
    where: { isActive: true, userId: { not: null }, commissionRate: { gt: 0 } },
    select: { id: true, userId: true, commissionRate: true, name: true },
  });

  const created = [];
  for (const emp of employees) {
    const sales = await db.saleOrder.findMany({
      where: {
        createdById: emp.userId,
        status: { in: ["confirmed", "dispatched", "delivered"] },
        saleDate: { gte: start, lte: end },
      },
      select: { id: true, invoiceNumber: true, totalAmount: true, saleDate: true },
    });

    for (const sale of sales) {
      const existing = await db.employeeCommission.findFirst({
        where: { employeeId: emp.id, saleOrderId: sale.id },
      });
      if (existing) continue;

      const commissionAmount = ((sale.totalAmount || 0) * (emp.commissionRate || 0)) / 100;
      if (commissionAmount <= 0) continue;

      const row = await db.employeeCommission.create({
        data: {
          employeeId: emp.id,
          saleOrderId: sale.id,
          commissionDate: sale.saleDate,
          saleAmount: sale.totalAmount || 0,
          commissionRate: emp.commissionRate || 0,
          commissionAmount,
          month: m,
          year: y,
          status: "pending",
          notes: sale.invoiceNumber,
        },
      });
      created.push(row);
    }
  }

  return created;
}

export async function markCommissionsIncluded(tx, employeeId, month, year, salaryRecordId, bonusAmount) {
  const rows = await tx.employeeCommission.findMany({
    where: {
      employeeId,
      month: parseInt(month, 10),
      year: parseInt(year, 10),
      status: "pending",
    },
    orderBy: { id: "asc" },
  });

  let remaining = bonusAmount;
  const ids = [];
  for (const row of rows) {
    if (remaining <= 0.001) break;
    const apply = Math.min(row.commissionAmount || 0, remaining);
    if (apply <= 0) continue;
    ids.push(row.id);
    remaining -= apply;
  }

  if (ids.length) {
    await tx.employeeCommission.updateMany({
      where: { id: { in: ids } },
      data: { status: "included", salaryRecordId },
    });
  }
}

/** Employees missing salary record or with pending clearance for a month. */
export async function getSalaryReviewReminders(db, month, year) {
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);

  const employees = await db.employee.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      department: true,
      salary: true,
      phone: true,
      userId: true,
    },
    orderBy: { name: "asc" },
  });

  const records = await db.salaryRecord.findMany({
    where: { month: m, year: y },
    select: {
      id: true,
      employeeId: true,
      status: true,
      netSalary: true,
      paidAmount: true,
    },
  });

  const recordByEmployee = Object.fromEntries(records.map((r) => [r.employeeId, r]));

  const reminders = [];
  for (const emp of employees) {
    const rec = recordByEmployee[emp.id];
    const pendingAdvance = await getPendingAdvanceTotal(db, emp.id);
    const pendingCommission = await getPendingCommissionTotal(db, emp.id, m, y);

    if (!rec) {
      reminders.push({
        type: "missing_salary",
        employee: emp,
        pendingAdvance,
        pendingCommission,
        message: "Salary record not created for this month",
      });
      continue;
    }

    if (rec.status === "pending" || (rec.paidAmount || 0) < (rec.netSalary || 0) - 0.01) {
      reminders.push({
        type: "pending_payment",
        employee: emp,
        salaryRecord: rec,
        pendingAdvance,
        pendingCommission,
        message: "Salary not fully paid",
      });
    }
  }

  return reminders;
}

export function computeNetSalary({ baseSalary = 0, bonus = 0, deductions = 0, advanceDeduction = 0, commissionBonus = 0 }) {
  const base = parseFloat(baseSalary) || 0;
  const bon = (parseFloat(bonus) || 0) + (parseFloat(commissionBonus) || 0);
  const deduct = (parseFloat(deductions) || 0) + (parseFloat(advanceDeduction) || 0);
  return base + bon - deduct;
}

/** Cap advance recovery to earned gross; return net pay and remaining advance pending. */
export function computeSalarySettlement({
  baseSalary = 0,
  bonus = 0,
  commissionBonus = 0,
  deductions = 0,
  pendingAdvance = 0,
  advanceDeduction,
}) {
  const grossEarned =
    (parseFloat(baseSalary) || 0) +
    (parseFloat(bonus) || 0) +
    (parseFloat(commissionBonus) || 0) -
    (parseFloat(deductions) || 0);
  const pending = Math.max(parseFloat(pendingAdvance) || 0, 0);
  const requested =
    advanceDeduction !== undefined && advanceDeduction !== null && advanceDeduction !== ""
      ? Math.max(parseFloat(advanceDeduction) || 0, 0)
      : pending;
  const advanceRecovery = Math.min(requested, Math.max(grossEarned, 0));
  const netSalary = Math.max(grossEarned - advanceRecovery, 0);
  const pendingAfter = Math.max(pending - advanceRecovery, 0);
  return {
    grossEarned,
    advanceDeduction: advanceRecovery,
    netSalary,
    pendingAfter,
    excessAdvance: Math.max(requested - advanceRecovery, 0),
  };
}

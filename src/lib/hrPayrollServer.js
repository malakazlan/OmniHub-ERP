function num(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function advanceId(row) {
  if (row?.id == null) return null;
  const id = Number(row.id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/** Ledger lines for a new salary advance (caller batches with createLedgerEntries). */
export function buildAdvanceLedgerEntries({
  advanceId: id,
  employee,
  advanceDate,
  totalPay,
  cash = 0,
  bank = 0,
  cashAccountId = null,
  bankAccountId = null,
}) {
  if (!id || totalPay <= 0) return [];

  const empName = employee?.name || "Employee";
  const reference = `ADV-${id}`;
  const entries = [];

  if (employee?.accountId) {
    entries.push({
      accountId: employee.accountId,
      date: advanceDate,
      description: `Salary advance — ${empName}`,
      reference,
      referenceType: "SalaryAdvance",
      referenceId: id,
      debit: totalPay,
      credit: 0,
    });
  }

  if (cash > 0 && cashAccountId) {
    entries.push({
      accountId: parseInt(cashAccountId, 10),
      date: advanceDate,
      description: `Advance (cash) — ${empName}`,
      reference,
      referenceType: "SalaryAdvance",
      referenceId: id,
      credit: cash,
      debit: 0,
    });
  }

  if (bank > 0 && bankAccountId) {
    entries.push({
      accountId: parseInt(bankAccountId, 10),
      date: advanceDate,
      description: `Advance (bank) — ${empName}`,
      reference,
      referenceType: "SalaryAdvance",
      referenceId: id,
      credit: bank,
      debit: 0,
    });
  }

  return entries;
}

/** Ledger credits when advance balance is recovered through salary clearance. */
export function buildAdvanceRecoveryLedgerEntries({
  settlements = [],
  employee,
  salaryRecordId,
  date,
  monthLabel,
}) {
  if (!employee?.accountId || !salaryRecordId || !settlements.length) return [];

  const empName = employee?.name || "Employee";
  const salRef = `SAL-${salaryRecordId}`;

  return settlements.map(({ advanceId, amount }) => ({
    accountId: employee.accountId,
    date,
    description: `Advance recovered from salary — ${empName} ADV-${advanceId} (${monthLabel})`,
    reference: salRef,
    referenceType: "SalaryRecord",
    referenceId: salaryRecordId,
    credit: amount,
    debit: 0,
  }));
}

/** Create advance row only — ledger lines returned for batch posting. */
export async function createSalaryAdvanceInTx(
  tx,
  {
    employeeId,
    employee,
    advanceDate,
    amount,
    cashAmount = 0,
    bankAmount = 0,
    cashAccountId = null,
    bankAccountId = null,
    notes = null,
  }
) {
  const empId = parseInt(employeeId, 10);
  const cash = num(cashAmount);
  const bank = num(bankAmount);
  const advanceAmt = num(amount);
  const totalPay = cash + bank > 0 ? cash + bank : advanceAmt;

  if (!empId || totalPay <= 0) return { advance: null, ledgerEntries: [] };

  const created = await tx.salaryAdvance.create({
    data: {
      employeeId: empId,
      advanceDate,
      amount: totalPay,
      cashAmount: cash,
      bankAmount: bank,
      cashAccountId: cashAccountId ? parseInt(cashAccountId, 10) : null,
      bankAccountId: bankAccountId ? parseInt(bankAccountId, 10) : null,
      notes,
      status: "pending",
    },
    select: { id: true },
  });

  const id = advanceId(created);
  if (!id) {
    throw new Error("Failed to create salary advance record");
  }

  const ledgerEntries = buildAdvanceLedgerEntries({
    advanceId: id,
    employee,
    advanceDate,
    totalPay,
    cash,
    bank,
    cashAccountId,
    bankAccountId,
  });

  return { advance: { id, employeeId: empId, amount: totalPay }, ledgerEntries };
}

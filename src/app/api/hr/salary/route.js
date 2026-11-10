import prisma, { runTransaction } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { createLedgerEntries } from "@/lib/ledger";
import { logActivity } from "@/lib/activityLog";
import { resolveUserCashAccountId, assertUserCanUseCashAccount } from "@/lib/userCashAccount";
import {
  settleAdvancesForSalary,
  markCommissionsIncluded,
  computeSalarySettlement,
  buildSalaryAdvanceSummary,
  getPendingAdvanceTotal,
} from "@/lib/hrPayroll";
import { createSalaryAdvanceInTx, buildAdvanceRecoveryLedgerEntries } from "@/lib/hrPayrollServer";

/** Stock and ledger flows run long interactive transactions; allow up to 60s on serverless hosts. */
export const maxDuration = 60;

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const employeeId = searchParams.get("employeeId");

    const where = {};
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);
    if (employeeId) where.employeeId = parseInt(employeeId);

    const salaryRecords = await prisma.salaryRecord.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true, fatherName: true, cnic: true, phone: true, department: true, designation: true, salary: true } },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    const employeeIds = [...new Set(salaryRecords.map((r) => r.employeeId))];
    const allAdvances = employeeIds.length
      ? await prisma.salaryAdvance.findMany({
          where: { employeeId: { in: employeeIds } },
          select: {
            id: true,
            employeeId: true,
            advanceDate: true,
            amount: true,
            settledAmount: true,
            status: true,
            notes: true,
          },
          orderBy: [{ advanceDate: "asc" }, { id: "asc" }],
        })
      : [];

    const advancesByEmployee = {};
    for (const adv of allAdvances) {
      if (!advancesByEmployee[adv.employeeId]) advancesByEmployee[adv.employeeId] = [];
      advancesByEmployee[adv.employeeId].push(adv);
    }

    const enrichedRecords = salaryRecords.map((record) => ({
      ...record,
      advanceSummary: buildSalaryAdvanceSummary(
        advancesByEmployee[record.employeeId] || [],
        record.month,
        record.year,
        record.advanceDeduction
      ),
    }));

    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true, name: true, salary: true, department: true },
      orderBy: { name: "asc" },
    });

    return Response.json({ success: true, salaryRecords: enrichedRecords, employees, monthNames: MONTH_NAMES });
  } catch (error) {
    console.error("List salary records error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "manager" && user.role !== "accountant")) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const {
      employeeId,
      month,
      year,
      baseSalary,
      deductions,
      advanceDeduction,
      bonus,
      commissionBonus,
      paidAmount,
      cashAmount,
      bankAmount,
      cashAccountId,
      bankAccountId,
      paymentDate,
      paymentMethod,
      status,
      notes,
      newAdvanceAmount,
      newAdvanceCash,
      newAdvanceBank,
      salaryCashAmount,
      salaryBankAmount,
    } = body;

    if (!employeeId || !month || !year) {
      return Response.json(
        { error: "Employee, month, and year are required" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(employeeId) },
    });
    if (!employee) {
      return Response.json({ error: "Employee not found" }, { status: 404 });
    }

    const base = baseSalary !== undefined && baseSalary !== ""
      ? parseFloat(baseSalary) || 0
      : employee.salary || 0;
    const deduct = parseFloat(deductions) || 0;
    const advRequested = parseFloat(advanceDeduction) || 0;
    const bon = parseFloat(bonus) || 0;
    const commBonus = parseFloat(commissionBonus) || 0;

    const pendingAdvanceTotal = await getPendingAdvanceTotal(prisma, parseInt(employeeId, 10));
    const settlement = computeSalarySettlement({
      baseSalary: base,
      bonus: bon,
      commissionBonus: commBonus,
      deductions: deduct,
      pendingAdvance: pendingAdvanceTotal,
      advanceDeduction: advRequested,
    });
    const advDeduct = settlement.advanceDeduction;
    const netSalary = settlement.netSalary;
    const salaryCashAmt = parseFloat(salaryCashAmount ?? cashAmount) || 0;
    const salaryBankAmt = parseFloat(salaryBankAmount ?? bankAmount) || 0;
    const newAdvAmt = parseFloat(newAdvanceAmount) || 0;
    const parsedAdvCash = parseFloat(newAdvanceCash);
    const parsedAdvBank = parseFloat(newAdvanceBank);
    const newAdvCash =
      Number.isFinite(parsedAdvCash) && parsedAdvCash > 0
        ? parsedAdvCash
        : newAdvAmt > 0 && !(Number.isFinite(parsedAdvBank) && parsedAdvBank > 0)
          ? newAdvAmt
          : 0;
    const newAdvBank = Number.isFinite(parsedAdvBank) && parsedAdvBank > 0 ? parsedAdvBank : 0;
    const cashAmt = salaryCashAmt;
    const bankAmt = salaryBankAmt;
    const paid = cashAmt + bankAmt > 0 ? cashAmt + bankAmt : parseFloat(paidAmount) || 0;
    const recordStatus = status || (paid >= netSalary && netSalary > 0 ? "paid" : "pending");
    const payDate = paymentDate ? new Date(paymentDate) : new Date();
    const monthLabel = `${MONTH_NAMES[parseInt(month) - 1] || month} ${year}`;

    let resolvedCashAccountId = cashAccountId ? parseInt(cashAccountId, 10) : null;
    const cashOutTotal = salaryCashAmt + newAdvCash;
    const bankOutTotal = salaryBankAmt + newAdvBank;

    if (cashOutTotal > 0) {
      if (!resolvedCashAccountId) {
        resolvedCashAccountId = await resolveUserCashAccountId(prisma, user.userId);
      }
      try {
        await assertUserCanUseCashAccount(prisma, user, resolvedCashAccountId);
      } catch (err) {
        return Response.json({ error: err.message }, { status: 403 });
      }
    }

    let resolvedBankAccountId = bankAccountId ? parseInt(bankAccountId, 10) : null;
    if (bankOutTotal > 0 && !resolvedBankAccountId) {
      return Response.json({ error: "Bank account is required for bank advance or salary payment" }, { status: 400 });
    }

    const empId = parseInt(employeeId, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    const existing = await prisma.salaryRecord.findUnique({
      where: { employeeId_month_year: { employeeId: empId, month: m, year: y } },
    });

    const record = await runTransaction(async (tx) => {
      const saved = await tx.salaryRecord.upsert({
        where: {
          employeeId_month_year: {
            employeeId: empId,
            month: m,
            year: y,
          },
        },
        create: {
          employeeId: empId,
          month: m,
          year: y,
          baseSalary: base,
          deductions: deduct,
          advanceDeduction: advDeduct,
          bonus: bon,
          commissionBonus: commBonus,
          netSalary,
          paidAmount: paid,
          cashAmount: cashAmt,
          bankAmount: bankAmt,
          cashAccountId: resolvedCashAccountId,
          bankAccountId: resolvedBankAccountId,
          paymentDate: paid > 0 ? payDate : null,
          paymentMethod: paymentMethod || null,
          status: recordStatus,
          notes: notes || null,
        },
        update: {
          baseSalary: base,
          deductions: deduct,
          advanceDeduction: advDeduct,
          bonus: bon,
          commissionBonus: commBonus,
          netSalary,
          paidAmount: paid,
          cashAmount: cashAmt,
          bankAmount: bankAmt,
          cashAccountId: resolvedCashAccountId,
          bankAccountId: resolvedBankAccountId,
          paymentDate: paid > 0 ? payDate : null,
          paymentMethod: paymentMethod || null,
          status: recordStatus,
          notes: notes || null,
        },
        include: {
          employee: { select: { id: true, name: true } },
        },
      });

      const ledgerEntries = [];
      const salRef = `SAL-${saved.id}`;

      if (employee.accountId) {
        const prevNet = existing?.netSalary || 0;
        const netDelta = netSalary - prevNet;
        if (Math.abs(netDelta) > 0.001) {
          ledgerEntries.push({
            accountId: employee.accountId,
            date: payDate,
            description: `Salary due for ${monthLabel} — ${employee.name}`,
            reference: salRef,
            referenceType: "SalaryRecord",
            referenceId: saved.id,
            credit: netDelta > 0 ? netDelta : 0,
            debit: netDelta < 0 ? -netDelta : 0,
          });
        }

        const prevPaid = existing?.paidAmount || 0;
        const paidDelta = paid - prevPaid;
        if (Math.abs(paidDelta) > 0.001) {
          ledgerEntries.push({
            accountId: employee.accountId,
            date: payDate,
            description: `Salary payment for ${monthLabel} — ${employee.name}`,
            reference: salRef,
            referenceType: "SalaryRecord",
            referenceId: saved.id,
            debit: paidDelta > 0 ? paidDelta : 0,
            credit: paidDelta < 0 ? -paidDelta : 0,
          });
        }
      }

      const prevCash = existing?.cashAmount || 0;
      const prevCashAcct = existing?.cashAccountId || null;
      const salaryCashDelta = cashAmt - (prevCashAcct === resolvedCashAccountId ? prevCash : 0);
      const prevBank = existing?.bankAmount || 0;
      const prevBankAcct = existing?.bankAccountId || null;
      const salaryBankDelta = bankAmt - (prevBankAcct === resolvedBankAccountId ? prevBank : 0);

      let advanceCashDelta = 0;
      let advanceBankDelta = 0;
      if (newAdvAmt > 0) {
        const { ledgerEntries: advLedger, advance: advRow } = await createSalaryAdvanceInTx(tx, {
          employeeId: empId,
          employee,
          advanceDate: payDate,
          amount: newAdvAmt,
          cashAmount: newAdvCash,
          bankAmount: newAdvBank,
          cashAccountId: resolvedCashAccountId,
          bankAccountId: resolvedBankAccountId,
          notes: `Advance with salary clearance — ${monthLabel}`,
        });
        if (advRow) {
          advanceCashDelta = newAdvCash;
          advanceBankDelta = newAdvBank;
          for (const line of advLedger) {
            const isCash =
              resolvedCashAccountId && line.accountId === resolvedCashAccountId && line.credit > 0;
            const isBank =
              resolvedBankAccountId && line.accountId === resolvedBankAccountId && line.credit > 0;
            if (!isCash && !isBank) ledgerEntries.push(line);
          }
        }
      }

      const totalCashDelta = salaryCashDelta + advanceCashDelta;
      const totalBankDelta = salaryBankDelta + advanceBankDelta;

      if (resolvedCashAccountId && Math.abs(totalCashDelta) > 0.001) {
        ledgerEntries.push({
          accountId: resolvedCashAccountId,
          date: payDate,
          description:
            advanceCashDelta > 0 && salaryCashDelta > 0
              ? `Salary + advance (cash) for ${monthLabel} — ${employee.name}`
              : advanceCashDelta > 0
                ? `Advance (cash) for ${monthLabel} — ${employee.name}`
                : `Salary payment (cash) for ${monthLabel} — ${employee.name}`,
          reference: salRef,
          referenceType: "SalaryRecord",
          referenceId: saved.id,
          credit: totalCashDelta > 0 ? totalCashDelta : 0,
          debit: totalCashDelta < 0 ? -totalCashDelta : 0,
        });
      }

      if (resolvedBankAccountId && Math.abs(totalBankDelta) > 0.001) {
        ledgerEntries.push({
          accountId: resolvedBankAccountId,
          date: payDate,
          description:
            advanceBankDelta > 0 && salaryBankDelta > 0
              ? `Salary + advance (bank) for ${monthLabel} — ${employee.name}`
              : advanceBankDelta > 0
                ? `Advance (bank) for ${monthLabel} — ${employee.name}`
                : `Salary payment (bank) for ${monthLabel} — ${employee.name}`,
          reference: salRef,
          referenceType: "SalaryRecord",
          referenceId: saved.id,
          credit: totalBankDelta > 0 ? totalBankDelta : 0,
          debit: totalBankDelta < 0 ? -totalBankDelta : 0,
        });
      }

      let advanceSettlements = [];
      if (advDeduct > 0) {
        advanceSettlements = await settleAdvancesForSalary(tx, empId, advDeduct, saved.id);
        ledgerEntries.push(
          ...buildAdvanceRecoveryLedgerEntries({
            settlements: advanceSettlements,
            employee,
            salaryRecordId: saved.id,
            date: payDate,
            monthLabel,
          })
        );
      }

      const sideEffects = [];
      if (commBonus > 0) {
        sideEffects.push(
          markCommissionsIncluded(tx, empId, m, y, saved.id, commBonus)
        );
      }
      if (ledgerEntries.length) {
        sideEffects.push(createLedgerEntries(tx, ledgerEntries));
      }
      if (sideEffects.length) await Promise.all(sideEffects);

      return saved;
    });

    logActivity({
      userId: user.userId,
      action: "CREATE",
      module: "hr",
      entityType: "SalaryRecord",
      entityId: record.id,
      details: { employeeId: record.employeeId, month: record.month, year: record.year, netSalary: record.netSalary, paidAmount: record.paidAmount },
      req,
    });

    return Response.json({ success: true, salaryRecord: record }, { status: 201 });
  } catch (error) {
    console.error("Create salary record error:", error);
    if (error.code === "P2028") {
      return Response.json({ error: "Database busy — retry in a moment." }, { status: 503 });
    }
    return Response.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

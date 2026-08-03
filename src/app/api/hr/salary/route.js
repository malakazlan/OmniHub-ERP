import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { createLedgerEntry } from "@/lib/ledger";
import { logActivity } from "@/lib/activityLog";
import { resolveUserCashAccountId, assertUserCanUseCashAccount } from "@/lib/userCashAccount";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
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
        employee: { select: { id: true, name: true, department: true, salary: true } },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true, name: true, salary: true, department: true },
      orderBy: { name: "asc" },
    });

    return Response.json({ success: true, salaryRecords, employees, monthNames: MONTH_NAMES });
  } catch (error) {
    console.error("List salary records error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = getUserFromRequest(req);
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
      bonus,
      paidAmount,
      cashAmount,
      bankAmount,
      cashAccountId,
      bankAccountId,
      paymentDate,
      paymentMethod,
      status,
      notes,
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
    const bon = parseFloat(bonus) || 0;
    const netSalary = base + bon - deduct;
    const cashAmt = parseFloat(cashAmount) || 0;
    const bankAmt = parseFloat(bankAmount) || 0;
    const paid = cashAmt + bankAmt > 0 ? cashAmt + bankAmt : parseFloat(paidAmount) || 0;
    const recordStatus = status || (paid >= netSalary && netSalary > 0 ? "paid" : "pending");
    const payDate = paymentDate ? new Date(paymentDate) : new Date();
    const monthLabel = `${MONTH_NAMES[parseInt(month) - 1] || month} ${year}`;

    let resolvedCashAccountId = cashAccountId ? parseInt(cashAccountId, 10) : null;
    if (cashAmt > 0) {
      if (!resolvedCashAccountId) {
        resolvedCashAccountId = await resolveUserCashAccountId(prisma, user.userId);
      }
      try {
        await assertUserCanUseCashAccount(prisma, user, resolvedCashAccountId);
      } catch (err) {
        return Response.json({ error: err.message }, { status: 403 });
      }
    }

    const record = await prisma.$transaction(async (tx) => {
      const existing = await tx.salaryRecord.findUnique({
        where: {
          employeeId_month_year: {
            employeeId: parseInt(employeeId),
            month: parseInt(month),
            year: parseInt(year),
          },
        },
      });

      const saved = await tx.salaryRecord.upsert({
        where: {
          employeeId_month_year: {
            employeeId: parseInt(employeeId),
            month: parseInt(month),
            year: parseInt(year),
          },
        },
        create: {
          employeeId: parseInt(employeeId),
          month: parseInt(month),
          year: parseInt(year),
          baseSalary: base,
          deductions: deduct,
          bonus: bon,
          netSalary,
          paidAmount: paid,
          cashAmount: cashAmt,
          bankAmount: bankAmt,
          cashAccountId: resolvedCashAccountId,
          bankAccountId: bankAccountId ? parseInt(bankAccountId) : null,
          paymentDate: paid > 0 ? payDate : null,
          paymentMethod: paymentMethod || null,
          status: recordStatus,
          notes: notes || null,
        },
        update: {
          baseSalary: base,
          deductions: deduct,
          bonus: bon,
          netSalary,
          paidAmount: paid,
          cashAmount: cashAmt,
          bankAmount: bankAmt,
          cashAccountId: resolvedCashAccountId,
          bankAccountId: bankAccountId ? parseInt(bankAccountId) : null,
          paymentDate: paid > 0 ? payDate : null,
          paymentMethod: paymentMethod || null,
          status: recordStatus,
          notes: notes || null,
        },
        include: {
          employee: { select: { id: true, name: true } },
        },
      });

      // Sync the employee's salary ledger account using deltas so repeated
      // edits to the same month's record never double-post entries.
      if (employee.accountId) {
        const prevNet = existing?.netSalary || 0;
        const netDelta = netSalary - prevNet;
        if (Math.abs(netDelta) > 0.001) {
          await createLedgerEntry(tx, {
            accountId: employee.accountId,
            date: payDate,
            description: `Salary due for ${monthLabel} — ${employee.name}`,
            reference: `SAL-${saved.id}`,
            referenceType: "SalaryRecord",
            referenceId: saved.id,
            credit: netDelta > 0 ? netDelta : 0,
            debit: netDelta < 0 ? -netDelta : 0,
          });
        }

        const prevPaid = existing?.paidAmount || 0;
        const paidDelta = paid - prevPaid;
        if (Math.abs(paidDelta) > 0.001) {
          await createLedgerEntry(tx, {
            accountId: employee.accountId,
            date: payDate,
            description: `Salary payment for ${monthLabel} — ${employee.name}`,
            reference: `SAL-${saved.id}`,
            referenceType: "SalaryRecord",
            referenceId: saved.id,
            debit: paidDelta > 0 ? paidDelta : 0,
            credit: paidDelta < 0 ? -paidDelta : 0,
          });
        }
      }

      // Reflect the actual cash/bank outflow so Day Close reconciliation
      // and account balances stay in sync in real time.
      const prevCash = existing?.cashAmount || 0;
      const prevCashAcct = existing?.cashAccountId || null;
      const cashDelta = cashAmt - (prevCashAcct === resolvedCashAccountId ? prevCash : 0);
      if (resolvedCashAccountId && Math.abs(cashDelta) > 0.001) {
        await createLedgerEntry(tx, {
          accountId: resolvedCashAccountId,
          date: payDate,
          description: `Salary payment (cash) for ${monthLabel} — ${employee.name}`,
          reference: `SAL-${saved.id}`,
          referenceType: "SalaryRecord",
          referenceId: saved.id,
          credit: cashDelta > 0 ? cashDelta : 0,
          debit: cashDelta < 0 ? -cashDelta : 0,
        });
      }

      const prevBank = existing?.bankAmount || 0;
      const prevBankAcct = existing?.bankAccountId || null;
      const bankDelta = bankAmt - (prevBankAcct === (bankAccountId ? parseInt(bankAccountId) : null) ? prevBank : 0);
      if (bankAccountId && Math.abs(bankDelta) > 0.001) {
        await createLedgerEntry(tx, {
          accountId: parseInt(bankAccountId),
          date: payDate,
          description: `Salary payment (bank) for ${monthLabel} — ${employee.name}`,
          reference: `SAL-${saved.id}`,
          referenceType: "SalaryRecord",
          referenceId: saved.id,
          credit: bankDelta > 0 ? bankDelta : 0,
          debit: bankDelta < 0 ? -bankDelta : 0,
        });
      }

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
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

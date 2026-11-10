import prisma, { runTransaction } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { createLedgerEntry } from "@/lib/ledger";
import { logActivity } from "@/lib/activityLog";
import { resolveUserCashAccountId, assertUserCanUseCashAccount } from "@/lib/userCashAccount";
import { advanceBalance, getPendingAdvanceTotal } from "@/lib/hrPayroll";

/** Stock and ledger flows run long interactive transactions; allow up to 60s on serverless hosts. */
export const maxDuration = 60;

function canManage(user) {
  return user && (user.role === "admin" || user.role === "manager" || user.role === "accountant");
}

export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");

    const where = {};
    if (employeeId) where.employeeId = parseInt(employeeId, 10);

    const advances = await prisma.salaryAdvance.findMany({
      where,
      include: { employee: { select: { id: true, name: true, department: true } } },
      orderBy: [{ advanceDate: "desc" }, { id: "desc" }],
    });

    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true, name: true, department: true, salary: true },
      orderBy: { name: "asc" },
    });

    const withBalance = advances.map((a) => ({
      ...a,
      balance: advanceBalance(a),
    }));

    return Response.json({ success: true, advances: withBalance, employees });
  } catch (error) {
    console.error("List salary advances error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!canManage(user)) return Response.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const employeeId = parseInt(body.employeeId, 10);
    const amount = parseFloat(body.amount) || 0;
    const cashAmount = parseFloat(body.cashAmount) || amount;
    const bankAmount = parseFloat(body.bankAmount) || 0;
    const totalPay = cashAmount + bankAmount || amount;

    if (!employeeId || totalPay <= 0) {
      return Response.json({ error: "Employee and amount are required" }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) return Response.json({ error: "Employee not found" }, { status: 404 });

    let cashAccountId = body.cashAccountId ? parseInt(body.cashAccountId, 10) : null;
    const bankAccountId = body.bankAccountId ? parseInt(body.bankAccountId, 10) : null;
    const advanceDate = body.advanceDate ? new Date(body.advanceDate) : new Date();

    if (cashAmount > 0) {
      if (!cashAccountId) cashAccountId = await resolveUserCashAccountId(prisma, user.userId);
      try {
        await assertUserCanUseCashAccount(prisma, user, cashAccountId);
      } catch (err) {
        return Response.json({ error: err.message }, { status: 403 });
      }
    }

    const advance = await runTransaction(async (tx) => {
      const created = await tx.salaryAdvance.create({
        data: {
          employeeId,
          advanceDate,
          amount: totalPay,
          cashAmount,
          bankAmount,
          cashAccountId,
          bankAccountId,
          notes: body.notes?.trim() || null,
          status: "pending",
        },
        include: { employee: { select: { id: true, name: true } } },
      });

      if (employee.accountId) {
        await createLedgerEntry(tx, {
          accountId: employee.accountId,
          date: advanceDate,
          description: `Salary advance — ${employee.name}`,
          reference: `ADV-${created.id}`,
          referenceType: "SalaryAdvance",
          referenceId: created.id,
          debit: totalPay,
        });
      }

      if (cashAmount > 0 && cashAccountId) {
        await createLedgerEntry(tx, {
          accountId: cashAccountId,
          date: advanceDate,
          description: `Advance (cash) — ${employee.name}`,
          reference: `ADV-${created.id}`,
          referenceType: "SalaryAdvance",
          referenceId: created.id,
          credit: cashAmount,
        });
      }

      if (bankAmount > 0 && bankAccountId) {
        await createLedgerEntry(tx, {
          accountId: bankAccountId,
          date: advanceDate,
          description: `Advance (bank) — ${employee.name}`,
          reference: `ADV-${created.id}`,
          referenceType: "SalaryAdvance",
          referenceId: created.id,
          credit: bankAmount,
        });
      }

      return created;
    });

    logActivity({
      userId: user.userId,
      action: "CREATE",
      module: "hr",
      entityType: "SalaryAdvance",
      entityId: advance.id,
      details: { employeeId, amount: totalPay },
      req,
    });

    const pendingTotal = await getPendingAdvanceTotal(prisma, employeeId);

    return Response.json({ success: true, advance, pendingTotal }, { status: 201 });
  } catch (error) {
    console.error("Create salary advance error:", error);
    if (error.code === "P2028") {
      return Response.json({ error: "Database busy — retry in a moment." }, { status: 503 });
    }
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

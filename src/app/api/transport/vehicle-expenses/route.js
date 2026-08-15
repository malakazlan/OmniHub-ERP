import prisma, { runTransaction } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { createLedgerEntry } from "@/lib/ledger";
import { logActivity } from "@/lib/activityLog";
import { assertUserCanUseCashAccount } from "@/lib/userCashAccount";

function canManage(user) {
  return user && (user.role === "admin" || user.role === "manager" || user.role === "accountant");
}

async function attachAccounts(expenses) {
  const accountIds = [...new Set(expenses.map((e) => e.accountId).filter(Boolean))];
  if (!accountIds.length) return expenses.map((e) => ({ ...e, account: null }));

  const accounts = await prisma.account.findMany({
    where: { id: { in: accountIds } },
    select: { id: true, name: true, category: true },
  });
  const map = Object.fromEntries(accounts.map((a) => [a.id, a]));
  return expenses.map((e) => ({
    ...e,
    account: e.accountId ? map[e.accountId] || null : null,
  }));
}

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get("vehicleId");

    const where = {};
    if (vehicleId) where.vehicleId = parseInt(vehicleId, 10);

    const expenses = await prisma.vehicleExpense.findMany({
      where,
      include: { vehicle: { select: { id: true, registrationNumber: true, vehicleType: true } } },
      orderBy: { expenseDate: "desc" },
    });

    const withAccounts = await attachAccounts(expenses);

    return Response.json({ success: true, expenses: withAccounts });
  } catch (error) {
    console.error("List vehicle expenses error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = getUserFromRequest(req);
    if (!canManage(user)) return Response.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const { vehicleId, expenseDate, expenseType, amount, description, paymentMethod, accountId, notes } = body;

    if (!vehicleId || !expenseType || !amount) {
      return Response.json({ error: "Vehicle, expense type, and amount are required" }, { status: 400 });
    }
    if (!accountId) {
      return Response.json({ error: "Select a cash or bank account to pay from" }, { status: 400 });
    }

    const vehicle = await prisma.vehicle.findUnique({ where: { id: parseInt(vehicleId, 10) } });
    if (!vehicle) return Response.json({ error: "Vehicle not found" }, { status: 404 });

    const parsedAmount = parseFloat(amount) || 0;
    if (parsedAmount <= 0) {
      return Response.json({ error: "Amount must be greater than zero" }, { status: 400 });
    }

    const payAccountId = parseInt(accountId, 10);
    const payAccount = await prisma.account.findFirst({
      where: { id: payAccountId, isActive: true, category: { in: ["cash", "bank"] } },
    });
    if (!payAccount) {
      return Response.json({ error: "Payment account must be an active cash or bank account" }, { status: 400 });
    }

    if (payAccount.category === "cash" && user.role !== "admin" && user.role !== "manager") {
      try {
        await assertUserCanUseCashAccount(prisma, user, payAccountId);
      } catch (err) {
        return Response.json({ error: err.message }, { status: 403 });
      }
    }

    if (payAccount.balance < parsedAmount) {
      return Response.json(
        { error: `Insufficient balance in ${payAccount.name}. Available: ${payAccount.balance.toFixed(2)}` },
        { status: 400 }
      );
    }

    const date = expenseDate ? new Date(expenseDate) : new Date();
    const ref = `VEX-${vehicle.registrationNumber}`;
    const ledgerDesc = `Fleet ${expenseType} · ${vehicle.registrationNumber}`;

    const expense = await runTransaction(async (tx) => {
      const created = await tx.vehicleExpense.create({
        data: {
          vehicleId: parseInt(vehicleId, 10),
          expenseDate: date,
          expenseType,
          amount: parsedAmount,
          description: description || null,
          paymentMethod: paymentMethod || (payAccount.category === "bank" ? "bank_transfer" : "cash"),
          accountId: payAccountId,
          notes: notes || null,
        },
        include: { vehicle: { select: { id: true, registrationNumber: true, vehicleType: true } } },
      });

      await createLedgerEntry(tx, {
        accountId: payAccountId,
        date,
        description: ledgerDesc,
        reference: `VEX-${created.id}`,
        referenceType: "VehicleExpense",
        referenceId: created.id,
        credit: parsedAmount,
      });

      return created;
    });

    const [withAccount] = await attachAccounts([expense]);

    logActivity({
      userId: user.userId,
      action: "CREATE",
      module: "transport",
      entityType: "VehicleExpense",
      entityId: expense.id,
      details: { vehicle: vehicle.registrationNumber, expenseType, amount: parsedAmount, accountId: payAccountId },
      req,
    });

    return Response.json({ success: true, expense: withAccount }, { status: 201 });
  } catch (error) {
    console.error("Create vehicle expense error:", error);
    return Response.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

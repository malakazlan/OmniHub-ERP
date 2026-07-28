import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { createLedgerEntry } from "@/lib/ledger";
import { logActivity } from "@/lib/activityLog";

function canManage(user) {
  return user && (user.role === "admin" || user.role === "manager");
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

    return Response.json({ success: true, expenses });
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

    const vehicle = await prisma.vehicle.findUnique({ where: { id: parseInt(vehicleId, 10) } });
    if (!vehicle) return Response.json({ error: "Vehicle not found" }, { status: 404 });

    const parsedAmount = parseFloat(amount) || 0;
    const date = expenseDate ? new Date(expenseDate) : new Date();

    const expense = await prisma.$transaction(async (tx) => {
      const created = await tx.vehicleExpense.create({
        data: {
          vehicleId: parseInt(vehicleId, 10),
          expenseDate: date,
          expenseType,
          amount: parsedAmount,
          description: description || null,
          paymentMethod: paymentMethod || "cash",
          accountId: accountId ? parseInt(accountId, 10) : null,
          notes: notes || null,
        },
      });

      if (accountId) {
        await createLedgerEntry(tx, {
          accountId: parseInt(accountId, 10),
          date,
          description: `${expenseType} expense for ${vehicle.registrationNumber}`,
          reference: `VEX-${created.id}`,
          referenceType: "VehicleExpense",
          referenceId: created.id,
          credit: parsedAmount,
        });
      }

      return created;
    });

    logActivity({
      userId: user.userId,
      action: "CREATE",
      module: "transport",
      entityType: "VehicleExpense",
      entityId: expense.id,
      details: { vehicle: vehicle.registrationNumber, expenseType, amount: parsedAmount },
      req,
    });

    return Response.json({ success: true, expense }, { status: 201 });
  } catch (error) {
    console.error("Create vehicle expense error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

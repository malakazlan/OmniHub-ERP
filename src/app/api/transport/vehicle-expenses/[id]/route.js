import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { createLedgerEntry } from "@/lib/ledger";
import { logActivity } from "@/lib/activityLog";

export async function DELETE(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Only admin can delete records" }, { status: 403 });
    }

    const { id } = await params;
    const expenseId = parseInt(id, 10);

    const expense = await prisma.vehicleExpense.findUnique({ where: { id: expenseId } });
    if (!expense) return Response.json({ error: "Expense not found" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      if (expense.accountId) {
        await createLedgerEntry(tx, {
          accountId: expense.accountId,
          date: new Date(),
          description: `Reversal of vehicle expense VEX-${expense.id}`,
          reference: `VEX-${expense.id}`,
          referenceType: "VehicleExpense",
          referenceId: expense.id,
          debit: expense.amount,
        });
      }
      await tx.vehicleExpense.delete({ where: { id: expenseId } });
    });

    logActivity({ userId: user.userId, action: "DELETE", module: "transport", entityType: "VehicleExpense", entityId: expenseId, req });

    return Response.json({ success: true, message: "Expense deleted successfully" });
  } catch (error) {
    console.error("Delete vehicle expense error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

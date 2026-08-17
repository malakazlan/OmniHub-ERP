import prisma, { runTransaction } from "@/lib/prisma";
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

    const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
    if (!expense) return Response.json({ error: "Expense not found" }, { status: 404 });

    await runTransaction(async (tx) => {
      if (expense.cashAmount > 0 && expense.cashAccountId) {
        await createLedgerEntry(tx, {
          accountId: expense.cashAccountId,
          date: new Date(),
          description: `Reversal of expense ${expense.expenseNumber}`,
          reference: expense.expenseNumber,
          referenceType: "Expense",
          referenceId: expense.id,
          debit: expense.cashAmount,
        });
      }
      if (expense.bankAmount > 0 && expense.bankAccountId) {
        await createLedgerEntry(tx, {
          accountId: expense.bankAccountId,
          date: new Date(),
          description: `Reversal of expense ${expense.expenseNumber}`,
          reference: expense.expenseNumber,
          referenceType: "Expense",
          referenceId: expense.id,
          debit: expense.bankAmount,
        });
      }
      await tx.expense.delete({ where: { id: expenseId } });
    });

    logActivity({ userId: user.userId, action: "DELETE", module: "accounts", entityType: "Expense", entityId: expenseId, req });

    return Response.json({ success: true, message: "Expense deleted successfully" });
  } catch (error) {
    console.error("Delete expense error:", error);
    if (error.code === "P2028") {
      return Response.json(
        { error: "Database busy — retry in a moment." },
        { status: 503 }
      );
    }
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import prisma, { runTransaction } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { generateDocumentNumber } from "@/lib/receipt";
import { createLedgerEntry } from "@/lib/ledger";
import { logActivity } from "@/lib/activityLog";
import { resolveUserCashAccountId, assertUserCanUseCashAccount } from "@/lib/userCashAccount";

function canManage(user) {
  return user && (user.role === "admin" || user.role === "manager" || user.role === "accountant");
}

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const categoryId = searchParams.get("categoryId");

    const where = {};
    if (from || to) {
      where.expenseDate = {};
      if (from) where.expenseDate.gte = new Date(from);
      if (to) where.expenseDate.lte = new Date(to);
    }
    if (categoryId) where.categoryId = parseInt(categoryId, 10);

    const expenses = await prisma.expense.findMany({
      where,
      include: { category: { select: { id: true, name: true } } },
      orderBy: { expenseDate: "desc" },
    });

    return Response.json({ success: true, expenses });
  } catch (error) {
    console.error("List expenses error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = getUserFromRequest(req);
    if (!canManage(user)) return Response.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const {
      expenseDate, expenseTitle, categoryId, cashAmount, bankAmount,
      bankAccountId, description, notes,
    } = body;
    let { cashAccountId } = body;

    const cash = parseFloat(cashAmount) || 0;
    const bank = parseFloat(bankAmount) || 0;
    const amount = cash + bank;

    if (!expenseTitle) return Response.json({ error: "Expense title is required" }, { status: 400 });
    if (amount <= 0) return Response.json({ error: "Amount must be greater than zero" }, { status: 400 });

    if (cash > 0 && !cashAccountId) {
      const userCash = await resolveUserCashAccountId(prisma, user.userId);
      if (userCash) cashAccountId = userCash;
    }

    if (cash > 0 && cashAccountId) {
      try {
        await assertUserCanUseCashAccount(prisma, user, cashAccountId);
      } catch (err) {
        return Response.json({ error: err.message }, { status: 403 });
      }
    }

    const date = expenseDate ? new Date(expenseDate) : new Date();
    const expenseNumber = await generateDocumentNumber("expense", date);
    const paymentMethod = cash > 0 && bank > 0 ? "split" : bank > 0 ? "bank" : "cash";

    const expense = await runTransaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          expenseNumber,
          expenseDate: date,
          expenseTitle,
          categoryId: categoryId ? parseInt(categoryId, 10) : null,
          amount,
          cashAmount: cash,
          bankAmount: bank,
          paymentMethod,
          cashAccountId: cashAccountId ? parseInt(cashAccountId, 10) : null,
          bankAccountId: bankAccountId ? parseInt(bankAccountId, 10) : null,
          description: description || null,
          notes: notes || null,
        },
        include: { category: { select: { id: true, name: true } } },
      });

      if (cash > 0 && cashAccountId) {
        await createLedgerEntry(tx, {
          accountId: parseInt(cashAccountId, 10),
          date,
          description: `Expense ${expenseNumber}: ${expenseTitle}`,
          reference: expenseNumber,
          referenceType: "Expense",
          referenceId: created.id,
          credit: cash,
        });
      }

      if (bank > 0 && bankAccountId) {
        await createLedgerEntry(tx, {
          accountId: parseInt(bankAccountId, 10),
          date,
          description: `Expense ${expenseNumber}: ${expenseTitle}`,
          reference: expenseNumber,
          referenceType: "Expense",
          referenceId: created.id,
          credit: bank,
        });
      }

      return created;
    });

    logActivity({
      userId: user.userId,
      action: "CREATE",
      module: "accounts",
      entityType: "Expense",
      entityId: expense.id,
      details: { expenseNumber, amount, expenseTitle },
      req,
    });

    return Response.json({ success: true, expense }, { status: 201 });
  } catch (error) {
    console.error("Create expense error:", error);
    if (error.code === "P2028") {
      return Response.json(
        { error: "Database busy — retry in a moment." },
        { status: 503 }
      );
    }
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

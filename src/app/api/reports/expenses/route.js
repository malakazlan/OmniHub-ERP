import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const dateFilter = {};
    if (from || to) {
      dateFilter.expenseDate = {};
      if (from) dateFilter.expenseDate.gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        dateFilter.expenseDate.lte = end;
      }
    }

    const expenses = await prisma.expense.findMany({
      where: { status: { not: "rejected" }, ...dateFilter },
      include: { category: true },
      orderBy: { expenseDate: "desc" },
      take: 500,
    });

    const byCategory = {};
    for (const exp of expenses) {
      const key = exp.category?.name || "Uncategorized";
      if (!byCategory[key]) byCategory[key] = { category: key, count: 0, total: 0 };
      byCategory[key].count += 1;
      byCategory[key].total += exp.amount;
    }

    const categorySummary = Object.values(byCategory).sort((a, b) => b.total - a.total);
    const total = expenses.reduce((s, e) => s + e.amount, 0);

    return Response.json({
      success: true,
      summary: { count: expenses.length, total, categories: categorySummary.length },
      expenses,
      categorySummary,
    });
  } catch (error) {
    console.error("Expense report error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

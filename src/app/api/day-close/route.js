import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";

function dayRange(dateStr) {
  const start = new Date(dateStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(dateStr);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// Cash/bank flow is derived directly from ledger entries on cash & bank
// accounts, so every source of movement (sales, purchases, expenses,
// standalone payments, journal entries, returns) is captured automatically
// and always stays in sync with the real account balances.
async function cashBankFlow(accountIds, { gte, lt } = {}) {
  if (accountIds.length === 0) return { in: 0, out: 0 };
  const where = { accountId: { in: accountIds } };
  if (gte || lt) {
    where.date = {};
    if (gte) where.date.gte = gte;
    if (lt) where.date.lt = lt;
  }
  const agg = await prisma.ledgerEntry.aggregate({
    where,
    _sum: { debit: true, credit: true },
  });
  return { in: agg._sum.debit || 0, out: agg._sum.credit || 0 };
}

async function computeDaySummary(dateStr) {
  const { start, end } = dayRange(dateStr);
  const dayEnd = new Date(end.getTime() + 1); // exclusive upper bound for `lt`

  const [sales, purchases, expenses, payments, cashAccounts, bankAccounts] = await Promise.all([
    prisma.saleOrder.findMany({
      where: { saleDate: { gte: start, lte: end }, status: { not: "cancelled" } },
      select: { totalAmount: true, cashAmount: true, bankAmount: true },
    }),
    prisma.purchaseOrder.findMany({
      where: { purchaseDate: { gte: start, lte: end }, status: { not: "cancelled" } },
      select: { totalAmount: true, cashAmount: true, bankAmount: true },
    }),
    prisma.expense.findMany({
      where: { expenseDate: { gte: start, lte: end } },
      select: { amount: true, cashAmount: true, bankAmount: true },
    }),
    prisma.payment.findMany({
      where: { paymentDate: { gte: start, lte: end } },
    }),
    prisma.account.findMany({ where: { category: "cash", isActive: true }, select: { id: true, balance: true, openingBalance: true } }),
    prisma.account.findMany({ where: { category: "bank", isActive: true }, select: { id: true, balance: true, openingBalance: true } }),
  ]);

  const cashAccountIds = cashAccounts.map((a) => a.id);
  const bankAccountIds = bankAccounts.map((a) => a.id);

  const [cashToday, bankToday, cashBefore, bankBefore] = await Promise.all([
    cashBankFlow(cashAccountIds, { gte: start, lt: dayEnd }),
    cashBankFlow(bankAccountIds, { gte: start, lt: dayEnd }),
    cashBankFlow(cashAccountIds, { lt: start }),
    cashBankFlow(bankAccountIds, { lt: start }),
  ]);

  const totalSales = sales.reduce((s, o) => s + o.totalAmount, 0);
  const totalPurchases = purchases.reduce((s, o) => s + o.totalAmount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  const cashIn = cashToday.in;
  const cashOut = cashToday.out;
  const bankIn = bankToday.in;
  const bankOut = bankToday.out;

  const chequePayments = payments.filter((p) => p.paymentMethod === "cheque");
  const chequeReceived = chequePayments.reduce((s, p) => s + (p.toAccountId ? p.amount : 0), 0);

  const openingCashBalance = cashAccounts.reduce((s, a) => s + (a.openingBalance || 0), 0);
  const openingCash = openingCashBalance + cashBefore.in - cashBefore.out;
  const openingBankBalance = bankAccounts.reduce((s, a) => s + (a.openingBalance || 0), 0);
  const openingBank = openingBankBalance + bankBefore.in - bankBefore.out;
  const computedClosingCash = openingCash + cashIn - cashOut;
  const computedClosingBank = openingBank + bankIn - bankOut;

  return {
    totalSales,
    totalPurchases,
    totalExpenses,
    cashReceived: cashIn,
    bankReceived: bankIn,
    chequeReceived,
    totalReceived: cashIn + bankIn + chequeReceived,
    cashOut,
    bankOut,
    openingCash,
    openingBank,
    computedClosingCash,
    computedClosingBank,
    counts: { sales: sales.length, purchases: purchases.length, expenses: expenses.length, payments: payments.length },
  };
}

export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (!date) {
      const closes = await prisma.dayClose.findMany({ orderBy: { closeDate: "desc" }, take: 60 });
      return Response.json({ success: true, closes });
    }

    const summary = await computeDaySummary(date);
    const existing = await prisma.dayClose.findUnique({ where: { closeDate: new Date(date) } });

    return Response.json({ success: true, summary, existing });
  } catch (error) {
    console.error("Day close summary error:", error);
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
    const { closeDate, closingCash, notes } = body;

    if (!closeDate) return Response.json({ error: "Close date is required" }, { status: 400 });

    const summary = await computeDaySummary(closeDate);
    const actualClosingCash = parseFloat(closingCash);
    const finalClosingCash = Number.isFinite(actualClosingCash) ? actualClosingCash : summary.computedClosingCash;
    const difference = finalClosingCash - summary.computedClosingCash;

    const dayClose = await prisma.dayClose.upsert({
      where: { closeDate: new Date(closeDate) },
      update: {
        openingCash: summary.openingCash,
        totalSales: summary.totalSales,
        totalPurchases: summary.totalPurchases,
        cashReceived: summary.cashReceived,
        bankReceived: summary.bankReceived,
        chequeReceived: summary.chequeReceived,
        totalReceived: summary.totalReceived,
        totalExpenses: summary.totalExpenses,
        closingCash: finalClosingCash,
        difference,
        summary: JSON.stringify(summary),
        status: "closed",
        closedBy: user.name,
        notes: notes || null,
      },
      create: {
        closeDate: new Date(closeDate),
        openingCash: summary.openingCash,
        totalSales: summary.totalSales,
        totalPurchases: summary.totalPurchases,
        cashReceived: summary.cashReceived,
        bankReceived: summary.bankReceived,
        chequeReceived: summary.chequeReceived,
        totalReceived: summary.totalReceived,
        totalExpenses: summary.totalExpenses,
        closingCash: finalClosingCash,
        difference,
        summary: JSON.stringify(summary),
        status: "closed",
        closedBy: user.name,
        notes: notes || null,
      },
    });

    logActivity({
      userId: user.userId,
      action: "CREATE",
      module: "accounts",
      entityType: "DayClose",
      entityId: dayClose.id,
      details: { closeDate, closingCash: finalClosingCash, difference },
      req,
    });

    return Response.json({ success: true, dayClose }, { status: 201 });
  } catch (error) {
    console.error("Create day close error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

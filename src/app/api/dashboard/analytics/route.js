import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { getReceivablesByCategory, getPayablesByCategory } from "@/lib/ledger";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function weekRange() {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

async function buildCashFlow(start, end) {
  const accounts = await prisma.account.findMany({
    where: { category: { in: ["cash", "bank"] }, isActive: true },
    select: { id: true, category: true, balance: true },
  });

  const accountIds = accounts.map((a) => a.id);
  const cashBalance = accounts
    .filter((a) => a.category === "cash")
    .reduce((s, a) => s + a.balance, 0);
  const bankBalance = accounts
    .filter((a) => a.category === "bank")
    .reduce((s, a) => s + a.balance, 0);

  const entries = accountIds.length
    ? await prisma.ledgerEntry.findMany({
        where: { date: { gte: start, lte: end }, accountId: { in: accountIds } },
        select: {
          date: true,
          debit: true,
          credit: true,
          account: { select: { category: true } },
        },
      })
    : [];

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    days.push({
      key: d.toDateString(),
      day: DAY_LABELS[d.getDay()],
      cashIn: 0,
      cashOut: 0,
      bankIn: 0,
      bankOut: 0,
    });
  }
  const dayMap = Object.fromEntries(days.map((d) => [d.key, d]));

  for (const entry of entries) {
    const bucket = dayMap[new Date(entry.date).toDateString()];
    if (!bucket) continue;
    const isCash = entry.account.category === "cash";
    if (isCash) {
      bucket.cashIn += entry.debit || 0;
      bucket.cashOut += entry.credit || 0;
    } else {
      bucket.bankIn += entry.debit || 0;
      bucket.bankOut += entry.credit || 0;
    }
  }

  const trend = days.map(({ day, cashIn, cashOut, bankIn, bankOut }) => {
    const totalIn = cashIn + bankIn;
    const totalOut = cashOut + bankOut;
    return { day, cashIn, cashOut, bankIn, bankOut, totalIn, totalOut, net: totalIn - totalOut };
  });

  const summary = trend.reduce(
    (acc, row) => ({
      cashIn: acc.cashIn + row.cashIn,
      cashOut: acc.cashOut + row.cashOut,
      bankIn: acc.bankIn + row.bankIn,
      bankOut: acc.bankOut + row.bankOut,
      totalIn: acc.totalIn + row.totalIn,
      totalOut: acc.totalOut + row.totalOut,
      net: acc.net + row.net,
    }),
    { cashIn: 0, cashOut: 0, bankIn: 0, bankOut: 0, totalIn: 0, totalOut: 0, net: 0 }
  );

  return {
    trend,
    balances: { cash: cashBalance, bank: bankBalance, total: cashBalance + bankBalance },
    summary,
  };
}

async function buildExpenseSummary(start, end) {
  const expenses = await prisma.expense.findMany({
    where: {
      status: { not: "rejected" },
      expenseDate: { gte: start, lte: end },
    },
    select: { amount: true, expenseDate: true, category: { select: { name: true } } },
  });

  const byCategory = {};
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    days.push({ key: d.toDateString(), day: DAY_LABELS[d.getDay()], amount: 0 });
  }
  const dayMap = Object.fromEntries(days.map((d) => [d.key, d]));

  for (const exp of expenses) {
    const cat = exp.category?.name || "Uncategorized";
    if (!byCategory[cat]) byCategory[cat] = { category: cat, total: 0 };
    byCategory[cat].total += exp.amount;

    const bucket = dayMap[new Date(exp.expenseDate).toDateString()];
    if (bucket) bucket.amount += exp.amount;
  }

  const categories = Object.values(byCategory)
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  return {
    trend: days.map(({ day, amount }) => ({ day, amount })),
    categories,
    total: expenses.reduce((s, e) => s + e.amount, 0),
  };
}

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { start, end } = weekRange();

    const [
      cashFlow,
      expenses,
      shopReceivables,
      companyReceivables,
      farmerPayables,
      transportPayables,
      generalPayables,
    ] = await Promise.all([
      buildCashFlow(start, end),
      buildExpenseSummary(start, end),
      getReceivablesByCategory("shop"),
      getReceivablesByCategory("company"),
      getPayablesByCategory("farmer"),
      getPayablesByCategory("transport"),
      getPayablesByCategory("general"),
    ]);

    const receivables = {
      total: shopReceivables + companyReceivables,
      breakdown: [
        { label: "Shops", amount: shopReceivables },
        { label: "Companies", amount: companyReceivables },
      ].filter((r) => r.amount > 0),
    };

    const payables = {
      total: farmerPayables + transportPayables + generalPayables,
      breakdown: [
        { label: "Farmers", amount: farmerPayables },
        { label: "Transport", amount: transportPayables },
        { label: "General", amount: generalPayables },
      ].filter((p) => p.amount > 0),
    };

    return Response.json({
      success: true,
      period: { from: start.toISOString(), to: end.toISOString(), label: "Last 7 days" },
      cashFlow,
      receivables,
      payables,
      expenses,
    });
  } catch (error) {
    console.error("Dashboard analytics error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

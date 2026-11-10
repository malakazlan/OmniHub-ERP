import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const saleDateFilter = {};
    const purchaseDateFilter = {};
    const expenseDateFilter = {};
    if (from || to) {
      saleDateFilter.saleDate = {};
      purchaseDateFilter.purchaseDate = {};
      expenseDateFilter.expenseDate = {};
      if (from) {
        saleDateFilter.saleDate.gte = new Date(from);
        purchaseDateFilter.purchaseDate.gte = new Date(from);
        expenseDateFilter.expenseDate.gte = new Date(from);
      }
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        saleDateFilter.saleDate.lte = end;
        purchaseDateFilter.purchaseDate.lte = end;
        expenseDateFilter.expenseDate.lte = end;
        transportDateFilter.createdAt.lte = end;
      }
    }

    const transportDateFilter = {};
    if (from || to) {
      transportDateFilter.createdAt = {};
      if (from) transportDateFilter.createdAt.gte = new Date(from);
      if (to) transportDateFilter.createdAt.lte = new Date(to);
    }

    const [salesAgg, soldItems, expensesAgg, transportAgg, salesByMonth] = await Promise.all([
      prisma.saleOrder.aggregate({ _sum: { totalAmount: true, subtotal: true }, where: { status: { not: "cancelled" }, ...saleDateFilter } }),
      // Cost of goods sold = quantity shipped x item cost. Purchases are inventory, not an expense,
      // until the goods are sold, so summing purchase orders here would overstate COGS.
      prisma.saleItem.findMany({
        where: { saleOrder: { status: { not: "cancelled" }, ...saleDateFilter } },
        select: { quantity: true, product: { select: { costPrice: true } } },
      }),
      prisma.expense.aggregate({ _sum: { amount: true }, where: { status: { not: "rejected" }, ...expenseDateFilter } }),
      prisma.transport.aggregate({ _sum: { totalCharges: true }, where: { status: { not: "cancelled" }, ...transportDateFilter } }),
      prisma.saleOrder.findMany({
        where: { status: { not: "cancelled" }, ...saleDateFilter },
        select: { saleDate: true, totalAmount: true },
      }),
    ]);

    const revenue = salesAgg._sum.totalAmount || 0;
    const cogs = Math.round(
      soldItems.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.product?.costPrice) || 0), 0) * 100
    ) / 100;
    const operatingExpenses = expensesAgg._sum.amount || 0;
    const transportCosts = transportAgg._sum.totalCharges || 0;
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - operatingExpenses - transportCosts;

    // Group sales revenue by month for trend
    const monthMap = {};
    salesByMonth.forEach((s) => {
      const key = new Date(s.saleDate).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      monthMap[key] = (monthMap[key] || 0) + s.totalAmount;
    });
    const monthlyTrend = Object.entries(monthMap).map(([month, total]) => ({ month, total }));

    return Response.json({
      success: true,
      summary: { revenue, cogs, grossProfit, operatingExpenses, transportCosts, netProfit },
      monthlyTrend,
    });
  } catch (error) {
    console.error("Profit & Loss report error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

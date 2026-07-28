import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { getReceivablesByCategory, getPayablesByCategory } from "@/lib/ledger";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

async function buildWeekTrend() {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const start = new Date(today);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);

  const [sales, purchases] = await Promise.all([
    prisma.saleOrder.findMany({
      where: { status: { not: "cancelled" }, saleDate: { gte: start, lte: today } },
      select: { saleDate: true, totalAmount: true },
    }),
    prisma.purchaseOrder.findMany({
      where: { status: { not: "cancelled" }, purchaseDate: { gte: start, lte: today } },
      select: { purchaseDate: true, totalAmount: true },
    }),
  ]);

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push({ key: d.toDateString(), day: DAY_LABELS[d.getDay()], Sales: 0, Purchases: 0 });
  }
  const dayMap = Object.fromEntries(days.map((d) => [d.key, d]));

  sales.forEach((s) => {
    const key = new Date(s.saleDate).toDateString();
    if (dayMap[key]) dayMap[key].Sales += s.totalAmount;
  });
  purchases.forEach((p) => {
    const key = new Date(p.purchaseDate).toDateString();
    if (dayMap[key]) dayMap[key].Purchases += p.totalAmount;
  });

  return days.map(({ day, Sales, Purchases }) => ({ day, Sales, Purchases }));
}

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const [salesAgg, purchasesAgg, lowStockProducts, trend] = await Promise.all([
      prisma.saleOrder.aggregate({
        _sum: { totalAmount: true },
        where: { status: { not: "cancelled" } },
      }),
      prisma.purchaseOrder.aggregate({
        _sum: { totalAmount: true },
        where: { status: { not: "cancelled" } },
      }),
      prisma.product.findMany({
        where: { isActive: true },
        select: { currentStock: true, minimumStock: true },
      }),
      buildWeekTrend(),
    ]);

    const [shopReceivables, companyReceivables, payables] = await Promise.all([
      getReceivablesByCategory("shop"),
      getReceivablesByCategory("company"),
      getPayablesByCategory("farmer"),
    ]);
    const receivables = shopReceivables + companyReceivables;

    const lowStockCount = lowStockProducts.filter(p => p.currentStock <= p.minimumStock).length;

    return Response.json({
      success: true,
      summary: {
        sales: salesAgg._sum.totalAmount || 0,
        purchases: purchasesAgg._sum.totalAmount || 0,
        outstandingReceivables: receivables,
        outstandingPayables: payables,
        lowStockCount,
      },
      trend,
    });
  } catch (error) {
    console.error("Reports summary error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

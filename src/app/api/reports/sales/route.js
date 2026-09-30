import { withDbRetry, isTransientDbError, dbUnavailableResponse } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { getReceivablesByCategory, getPayablesByCategory } from "@/lib/ledger";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

async function buildWeekTrend(db) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const start = new Date(today);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);

  const [sales, purchases] = await Promise.all([
    db.saleOrder.findMany({
      where: { status: { not: "cancelled" }, saleDate: { gte: start, lte: today } },
      select: { saleDate: true, totalAmount: true },
    }),
    db.purchaseOrder.findMany({
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

    const summary = await withDbRetry(async (db) => {
      const [salesAgg, purchasesAgg, lowStockProducts, trend] = await Promise.all([
        db.saleOrder.aggregate({
          _sum: { totalAmount: true },
          where: { status: { not: "cancelled" } },
        }),
        db.purchaseOrder.aggregate({
          _sum: { totalAmount: true },
          where: { status: { not: "cancelled" } },
        }),
        db.product.findMany({
          where: { isActive: true },
          select: { currentStock: true, minimumStock: true },
        }),
        buildWeekTrend(db),
      ]);

      const [shopReceivables, companyReceivables, farmerReceivables, companyPayables] = await Promise.all([
        getReceivablesByCategory("shop"),
        getReceivablesByCategory("company"),
        getReceivablesByCategory("farmer"),
        getPayablesByCategory("company"),
      ]);
      const receivables = shopReceivables + companyReceivables + farmerReceivables;
      const payables = companyPayables;
      const lowStockCount = lowStockProducts.filter((p) => p.currentStock <= p.minimumStock).length;

      return {
        sales: salesAgg._sum.totalAmount || 0,
        purchases: purchasesAgg._sum.totalAmount || 0,
        outstandingReceivables: receivables,
        outstandingPayables: payables,
        lowStockCount,
        trend,
      };
    });

    return Response.json({
      success: true,
      summary: {
        sales: summary.sales,
        purchases: summary.purchases,
        outstandingReceivables: summary.outstandingReceivables,
        outstandingPayables: summary.outstandingPayables,
        lowStockCount: summary.lowStockCount,
      },
      trend: summary.trend,
    });
  } catch (error) {
    console.error("Reports summary error:", error);
    if (isTransientDbError(error)) return dbUnavailableResponse(error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

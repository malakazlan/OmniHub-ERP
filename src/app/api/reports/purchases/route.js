import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const dateFilter = {};
    if (from || to) {
      dateFilter.purchaseDate = {};
      if (from) dateFilter.purchaseDate.gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        dateFilter.purchaseDate.lte = end;
      }
    }

    const purchases = await prisma.purchaseOrder.findMany({
      where: { status: { not: "cancelled" }, ...dateFilter },
      include: { items: true, farmer: true, company: true },
      orderBy: { purchaseDate: "desc" },
      take: 200,
    });

    const total = purchases.reduce((s, o) => s + o.totalAmount, 0);
    const paid = purchases.reduce((s, o) => s + o.paidAmount, 0);

    return Response.json({
      success: true,
      summary: { count: purchases.length, total, paid, outstanding: total - paid },
      purchases,
    });
  } catch (error) {
    console.error("Purchases report error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

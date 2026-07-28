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
      dateFilter.saleDate = {};
      if (from) dateFilter.saleDate.gte = new Date(from);
      if (to) dateFilter.saleDate.lte = new Date(to);
    }

    const sales = await prisma.saleOrder.findMany({
      where: { status: { not: "cancelled" }, ...dateFilter },
      include: { items: true, company: true, shop: true },
      orderBy: { saleDate: "desc" },
      take: 200,
    });

    const total = sales.reduce((s, o) => s + o.totalAmount, 0);
    const paid = sales.reduce((s, o) => s + o.paidAmount, 0);

    return Response.json({
      success: true,
      summary: { count: sales.length, total, paid, outstanding: total - paid },
      sales,
    });
  } catch (error) {
    console.error("Sales report error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

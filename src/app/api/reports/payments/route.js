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
      dateFilter.paymentDate = {};
      if (from) dateFilter.paymentDate.gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        dateFilter.paymentDate.lte = end;
      }
    }

    const payments = await prisma.payment.findMany({
      where: { status: { not: "cancelled" }, ...dateFilter },
      orderBy: { paymentDate: "desc" },
      take: 500,
    });

    const byMethod = {};
    for (const p of payments) {
      const key = p.paymentMethod || "other";
      if (!byMethod[key]) byMethod[key] = { method: key, count: 0, total: 0 };
      byMethod[key].count += 1;
      byMethod[key].total += p.amount;
    }

    const methodSummary = Object.values(byMethod).sort((a, b) => b.total - a.total);
    const total = payments.reduce((s, p) => s + p.amount, 0);

    return Response.json({
      success: true,
      summary: { count: payments.length, total },
      payments,
      methodSummary,
    });
  } catch (error) {
    console.error("Payment report error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

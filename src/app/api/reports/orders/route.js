import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { canViewOrders, canReviewOrder } from "@/lib/customerOrderAccess";

export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || !canViewOrders(user)) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (!canReviewOrder(user)) {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const dateFilter = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    const where = {};
    if (Object.keys(dateFilter).length) where.orderDate = dateFilter;

    const [orders, byStatus, byCreator] = await Promise.all([
      prisma.customerOrder.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          orderDate: true,
          customerName: true,
          totalAmount: true,
          status: true,
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { orderDate: "desc" },
      }),
      prisma.customerOrder.groupBy({
        by: ["status"],
        where,
        _count: { id: true },
        _sum: { totalAmount: true },
      }),
      prisma.customerOrder.groupBy({
        by: ["createdById"],
        where: { ...where, createdById: { not: null } },
        _count: { id: true },
        _sum: { totalAmount: true },
      }),
    ]);

    const creatorIds = byCreator.map((r) => r.createdById).filter(Boolean);
    const creators = creatorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: creatorIds } },
          select: { id: true, name: true },
        })
      : [];
    const creatorMap = Object.fromEntries(creators.map((c) => [c.id, c.name]));

    return Response.json({
      success: true,
      orders,
      summary: {
        byStatus: byStatus.map((row) => ({
          status: row.status,
          count: row._count.id,
          totalAmount: row._sum.totalAmount || 0,
        })),
        bySalesperson: byCreator.map((row) => ({
          userId: row.createdById,
          name: creatorMap[row.createdById] || "Unknown",
          count: row._count.id,
          totalAmount: row._sum.totalAmount || 0,
        })),
      },
    });
  } catch (error) {
    console.error("Orders report error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

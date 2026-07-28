import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Only admin can view activity logs" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const module = searchParams.get("module");
    const action = searchParams.get("action");
    const userId = searchParams.get("userId");
    const limit = Math.min(parseInt(searchParams.get("limit") || "200", 10), 500);

    const where = {};
    if (module) where.module = module;
    if (action) where.action = action;
    if (userId) where.userId = parseInt(userId, 10);

    const logs = await prisma.activityLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return Response.json({ success: true, logs });
  } catch (error) {
    console.error("List activity logs error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

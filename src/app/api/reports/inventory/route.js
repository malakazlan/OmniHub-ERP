import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: { name: "asc" },
    });

    const enriched = products.map((p) => ({
      ...p,
      stockValue: (p.currentStock || 0) * (p.costPrice || 0),
      isLow: p.currentStock <= p.minimumStock,
    }));

    const totalStockValue = enriched.reduce((s, p) => s + p.stockValue, 0);
    const lowStockCount = enriched.filter((p) => p.isLow).length;

    return Response.json({
      success: true,
      summary: { count: products.length, totalStockValue, lowStockCount },
      products: enriched,
    });
  } catch (error) {
    console.error("Inventory report error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

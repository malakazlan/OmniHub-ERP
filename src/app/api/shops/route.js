import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";
import { directoryCreateBlocked, requireProjectAccountsAdmin } from "@/lib/directoryCreate";

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const shops = await prisma.shop.findMany({
      include: {
        saleOrders: { select: { totalAmount: true, paidAmount: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const shopsWithBalance = await Promise.all(
      shops.map(async (shop) => {
        if (!shop.accountId) return { ...shop, balance: 0 };
        const account = await prisma.account.findUnique({
          where: { id: shop.accountId },
          select: { balance: true },
        });
        return { ...shop, balance: account?.balance || 0 };
      })
    );

    return Response.json({ success: true, shops: shopsWithBalance });
  } catch (error) {
    console.error("List shops error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "manager" && user.role !== "salesperson")) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const blocked = directoryCreateBlocked(body);
    if (blocked) return blocked;
    const adminOnly = requireProjectAccountsAdmin(user);
    if (adminOnly) return adminOnly;

    const {
      name, ownerName, phone, whatsappNumber, city, area, address,
      shopType, creditLimit, assignedTo, notes,
    } = body;

    if (!name) return Response.json({ error: "Shop name is required" }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.account.create({
        data: {
          name: `${name} (Shop)`,
          type: "asset",
          category: "shop",
          city,
          phone,
          whatsappNumber,
          address,
        },
      });

      const shop = await tx.shop.create({
        data: {
          name,
          ownerName,
          phone,
          whatsappNumber,
          city,
          area,
          address,
          shopType: shopType || "retail",
          creditLimit: parseFloat(creditLimit) || 0,
          assignedTo: assignedTo ? parseInt(assignedTo) : null,
          notes,
          accountId: account.id,
        },
      });

      return shop;
    });

    logActivity({ userId: user.userId, action: "CREATE", module: "shops", entityType: "Shop", entityId: result.id, details: { name: result.name }, req });

    return Response.json({ success: true, shop: result }, { status: 201 });
  } catch (error) {
    console.error("Create shop error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

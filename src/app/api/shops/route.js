import prisma, { runTransaction } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";
import { directoryCreateBlocked, requireProjectAccountsAdmin } from "@/lib/directoryCreate";
import { applyOpeningBalance } from "@/lib/accountOpening";

/** Stock and ledger flows run long interactive transactions; allow up to 60s on serverless hosts. */
export const maxDuration = 60;

export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const shops = await prisma.shop.findMany({
      include: {
        saleOrders: { select: { totalAmount: true, paidAmount: true } },
        dealer: { select: { id: true, name: true } },
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
    const user = await getUserFromRequest(req);
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
      shopType, creditLimit, assignedTo, dealerId, notes, openingBalance,
    } = body;

    if (!name?.trim()) return Response.json({ error: "Shop name is required" }, { status: 400 });
    if (!phone?.trim()) return Response.json({ error: "Phone is required" }, { status: 400 });

    const result = await runTransaction(async (tx) => {
      const account = await tx.account.create({
        data: {
          name: name.trim(),
          type: "asset",
          category: "shop",
          city: city || null,
          phone: phone.trim(),
          whatsappNumber: whatsappNumber || null,
          address: address || null,
        },
      });

      await applyOpeningBalance(tx, account.id, "asset", openingBalance, body.openingBalanceDate);

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
          dealerId: dealerId ? parseInt(dealerId, 10) : null,
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

import prisma, { runTransaction } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { LEDGER_ENTRY_ORDER } from "@/lib/ledger";
import { logActivity } from "@/lib/activityLog";
import { syncAccountBalanceFromForm, updateOpeningBalanceDate } from "@/lib/accountOpening";

export async function GET(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const shopId = parseInt(id);

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        saleOrders: { orderBy: { saleDate: "desc" }, take: 10 },
        dealer: { select: { id: true, name: true, phone: true, city: true } },
      },
    });

    if (!shop) return Response.json({ error: "Shop not found" }, { status: 404 });

    let balance = 0;
    let ledgerEntries = [];
    if (shop.accountId) {
      const account = await prisma.account.findUnique({ where: { id: shop.accountId } });
      balance = account?.balance || 0;
      ledgerEntries = await prisma.ledgerEntry.findMany({
        where: { accountId: shop.accountId },
        orderBy: LEDGER_ENTRY_ORDER,
      });
    }

    return Response.json({ success: true, shop, balance, ledgerEntries });
  } catch (error) {
    console.error("Fetch shop error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "manager" && user.role !== "salesperson")) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const shopId = parseInt(id);
    const body = await req.json();

    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) return Response.json({ error: "Shop not found" }, { status: 404 });

    const updated = await runTransaction(async (tx) => {
      const s = await tx.shop.update({
        where: { id: shopId },
        data: {
          name: body.name,
          ownerName: body.ownerName,
          phone: body.phone,
          whatsappNumber: body.whatsappNumber,
          city: body.city,
          area: body.area,
          address: body.address,
          shopType: body.shopType,
          creditLimit: body.creditLimit !== undefined ? parseFloat(body.creditLimit) : shop.creditLimit,
          assignedTo: body.assignedTo !== undefined ? (body.assignedTo ? parseInt(body.assignedTo) : null) : shop.assignedTo,
          dealerId: body.dealerId !== undefined ? (body.dealerId ? parseInt(body.dealerId, 10) : null) : shop.dealerId,
          notes: body.notes,
          isActive: body.isActive !== undefined ? body.isActive : shop.isActive,
        },
      });

      if (shop.accountId) {
        await tx.account.update({
          where: { id: shop.accountId },
          data: {
            name: body.name || s.name,
            city: body.city,
            phone: body.phone,
            whatsappNumber: body.whatsappNumber,
            address: body.address,
            isActive: body.isActive !== undefined ? body.isActive : shop.isActive,
          },
        });
        await syncAccountBalanceFromForm(tx, shop.accountId, body.currentBalance);
        if (body.openingBalanceDate) {
          await updateOpeningBalanceDate(tx, shop.accountId, body.openingBalanceDate);
        }
      }

      return s;
    });

    return Response.json({ success: true, shop: updated });
  } catch (error) {
    console.error("Update shop error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Only admin can delete records" }, { status: 403 });
    }

    const { id } = await params;
    const shopId = parseInt(id);

    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) return Response.json({ error: "Shop not found" }, { status: 404 });

    const saleCount = await prisma.saleOrder.count({ where: { shopId } });
    if (saleCount > 0) {
      return Response.json({
        error: "Cannot delete shop with order history. Suspend the account instead.",
      }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.shop.delete({ where: { id: shopId } });
      if (shop.accountId) {
        await tx.account.delete({ where: { id: shop.accountId } });
      }
    });

    logActivity({ userId: user.userId, action: "DELETE", module: "shops", entityType: "Shop", entityId: shopId, details: { name: shop.name }, req });

    return Response.json({ success: true, message: "Shop deleted successfully" });
  } catch (error) {
    console.error("Delete shop error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

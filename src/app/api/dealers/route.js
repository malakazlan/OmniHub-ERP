import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";
import { buildDealerListRow } from "@/lib/dealerSummary";

function canManage(user) {
  return user && (user.role === "admin" || user.role === "manager" || user.role === "salesperson");
}

export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const dealers = await prisma.dealer.findMany({
      include: {
        shops: {
          select: { id: true, accountId: true, isActive: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const rows = await Promise.all(
      dealers.map((dealer) => buildDealerListRow(prisma, dealer, dealer.shops))
    );

    const totals = rows.reduce(
      (acc, row) => ({
        dealers: rows.length,
        shops: acc.shops + row.shopCount,
        receivable: acc.receivable + row.totalReceivable,
      }),
      { dealers: rows.length, shops: 0, receivable: 0 }
    );

    return Response.json({ success: true, dealers: rows, totals });
  } catch (error) {
    console.error("List dealers error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!canManage(user)) return Response.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const { name, contactPerson, phone, whatsappNumber, city, address, notes } = body;

    if (!name?.trim()) return Response.json({ error: "Dealer name is required" }, { status: 400 });

    const dealer = await prisma.dealer.create({
      data: {
        name: name.trim(),
        contactPerson: contactPerson?.trim() || null,
        phone: phone?.trim() || null,
        whatsappNumber: whatsappNumber?.trim() || null,
        city: city?.trim() || null,
        address: address?.trim() || null,
        notes: notes?.trim() || null,
      },
    });

    await logActivity({
      userId: user.userId,
      action: "CREATE",
      module: "dealers",
      entityType: "Dealer",
      entityId: dealer.id,
      details: { name: dealer.name },
      req,
    });

    return Response.json({ success: true, dealer }, { status: 201 });
  } catch (error) {
    console.error("Create dealer error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

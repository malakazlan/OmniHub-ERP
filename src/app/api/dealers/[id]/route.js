import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";
import { summarizeDealerShops } from "@/lib/dealerSummary";

function canManage(user) {
  return user && (user.role === "admin" || user.role === "manager" || user.role === "salesperson");
}

export async function GET(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const dealerId = parseInt(id, 10);
    if (!Number.isFinite(dealerId)) {
      return Response.json({ error: "Invalid dealer id" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const dealer = await prisma.dealer.findUnique({
      where: { id: dealerId },
      include: {
        shops: {
          select: {
            id: true,
            name: true,
            city: true,
            area: true,
            phone: true,
            isActive: true,
            accountId: true,
          },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!dealer) return Response.json({ error: "Dealer not found" }, { status: 404 });

    const { summary, shops } = await summarizeDealerShops(prisma, dealer.shops, { from, to });

    return Response.json({
      success: true,
      dealer: {
        id: dealer.id,
        name: dealer.name,
        contactPerson: dealer.contactPerson,
        phone: dealer.phone,
        whatsappNumber: dealer.whatsappNumber,
        city: dealer.city,
        address: dealer.address,
        notes: dealer.notes,
        isActive: dealer.isActive,
      },
      summary,
      shops,
      period: { from, to },
    });
  } catch (error) {
    console.error("Fetch dealer error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    if (!canManage(user)) return Response.json({ error: "Unauthorized" }, { status: 403 });

    const { id } = await params;
    const dealerId = parseInt(id, 10);
    const body = await req.json();

    const existing = await prisma.dealer.findUnique({ where: { id: dealerId } });
    if (!existing) return Response.json({ error: "Dealer not found" }, { status: 404 });

    const dealer = await prisma.dealer.update({
      where: { id: dealerId },
      data: {
        name: body.name?.trim() || existing.name,
        contactPerson: body.contactPerson !== undefined ? body.contactPerson?.trim() || null : existing.contactPerson,
        phone: body.phone !== undefined ? body.phone?.trim() || null : existing.phone,
        whatsappNumber: body.whatsappNumber !== undefined ? body.whatsappNumber?.trim() || null : existing.whatsappNumber,
        city: body.city !== undefined ? body.city?.trim() || null : existing.city,
        address: body.address !== undefined ? body.address?.trim() || null : existing.address,
        notes: body.notes !== undefined ? body.notes?.trim() || null : existing.notes,
        isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
      },
    });

    return Response.json({ success: true, dealer });
  } catch (error) {
    console.error("Update dealer error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Only admin can delete dealers" }, { status: 403 });
    }

    const { id } = await params;
    const dealerId = parseInt(id, 10);

    const dealer = await prisma.dealer.findUnique({
      where: { id: dealerId },
      include: { shops: { select: { id: true } } },
    });
    if (!dealer) return Response.json({ error: "Dealer not found" }, { status: 404 });

    if (dealer.shops.length > 0) {
      return Response.json({
        error: "Cannot delete dealer with assigned shops. Reassign shops first or deactivate the dealer.",
      }, { status: 400 });
    }

    await prisma.dealer.delete({ where: { id: dealerId } });

    await logActivity({
      userId: user.userId,
      action: "DELETE",
      module: "dealers",
      entityType: "Dealer",
      entityId: dealerId,
      details: { name: dealer.name },
      req,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Delete dealer error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

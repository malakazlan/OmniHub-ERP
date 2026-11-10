import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { TRANSPORT_STATUSES } from "@/lib/constants";
import { logActivity } from "@/lib/activityLog";

function canManage(user) {
  return user && (user.role === "admin" || user.role === "manager" || user.role === "accountant");
}

export async function PATCH(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    if (!canManage(user)) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const transportId = parseInt(id, 10);
    const { status } = await req.json();

    if (!status || !TRANSPORT_STATUSES.includes(status)) {
      return Response.json({ error: "Valid trip status is required" }, { status: 400 });
    }

    const existing = await prisma.transport.findUnique({ where: { id: transportId } });
    if (!existing) {
      return Response.json({ error: "Transport not found" }, { status: 404 });
    }

    const transport = await prisma.transport.update({
      where: { id: transportId },
      data: { status },
      include: {
        vehicle: { select: { id: true, registrationNumber: true, vehicleType: true } },
      },
    });

    logActivity({
      userId: user.userId,
      action: "UPDATE",
      module: "transport",
      entityType: "Transport",
      entityId: transport.id,
      details: { action: "status", from: existing.status, to: status },
      req,
    });

    return Response.json({ success: true, transport });
  } catch (error) {
    console.error("Update transport status error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

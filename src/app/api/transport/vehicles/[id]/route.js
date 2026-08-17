import prisma, { runTransaction } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { syncAccountBalanceFromForm } from "@/lib/accountOpening";
import { trimOrNull } from "@/lib/stringUtils";

export async function GET(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: parseInt(id) },
      include: {
        transports: { take: 10, orderBy: { createdAt: "desc" } },
        expenses: { take: 10, orderBy: { expenseDate: "desc" } },
      },
    });

    if (!vehicle) {
      return Response.json({ error: "Vehicle not found" }, { status: 404 });
    }

    return Response.json({ success: true, vehicle });
  } catch (error) {
    console.error("Fetch vehicle error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "manager")) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const vehicleId = parseInt(id);
    const body = await req.json();

    const existing = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!existing) {
      return Response.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const regNo = body.registrationNumber?.trim() || existing.registrationNumber;
    const vehicleType = body.vehicleType?.trim() || existing.vehicleType;
    const driverPhone = body.driverPhone !== undefined ? trimOrNull(body.driverPhone) : existing.driverPhone;

    if (regNo !== existing.registrationNumber) {
      const dup = await prisma.vehicle.findUnique({ where: { registrationNumber: regNo } });
      if (dup) {
        return Response.json({ error: "Registration number already in use" }, { status: 400 });
      }
    }

    const displayName = `${regNo} (${vehicleType.charAt(0).toUpperCase()}${vehicleType.slice(1)})`;

    const vehicle = await runTransaction(async (tx) => {
      const updated = await tx.vehicle.update({
        where: { id: vehicleId },
        data: {
          registrationNumber: regNo,
          vehicleType,
          make: body.make !== undefined ? trimOrNull(body.make) : existing.make,
          model: body.model !== undefined ? trimOrNull(body.model) : existing.model,
          year: body.year !== undefined ? (body.year ? parseInt(body.year, 10) : null) : existing.year,
          capacity: body.capacity !== undefined ? parseFloat(body.capacity) || 0 : existing.capacity,
          driverName: body.driverName !== undefined ? trimOrNull(body.driverName) : existing.driverName,
          driverPhone,
          isOwned: body.isOwned !== undefined ? Boolean(body.isOwned) : existing.isOwned,
          isActive: body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive,
          notes: body.notes !== undefined ? trimOrNull(body.notes) : existing.notes,
        },
      });

      if (existing.accountId) {
        await tx.account.update({
          where: { id: existing.accountId },
          data: {
            name: displayName,
            phone: driverPhone,
            reference: regNo,
            isActive: updated.isActive,
          },
        });
        await syncAccountBalanceFromForm(tx, existing.accountId, body.currentBalance);
      }

      return updated;
    });

    return Response.json({ success: true, vehicle });
  } catch (error) {
    console.error("Update vehicle error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Only admin can delete vehicles" }, { status: 403 });
    }

    const { id } = await params;
    const vehicleId = parseInt(id);

    const existing = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!existing) {
      return Response.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const transportCount = await prisma.transport.count({ where: { vehicleId } });
    if (transportCount > 0) {
      return Response.json(
        { error: "Cannot delete vehicle with transport history. Deactivate instead." },
        { status: 400 }
      );
    }

    await runTransaction(async (tx) => {
      await tx.vehicle.delete({ where: { id: vehicleId } });
      if (existing.accountId) {
        await tx.ledgerEntry.deleteMany({ where: { accountId: existing.accountId } });
        await tx.account.delete({ where: { id: existing.accountId } }).catch(() => {});
      }
    });

    return Response.json({ success: true, message: "Vehicle deleted" });
  } catch (error) {
    console.error("Delete vehicle error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

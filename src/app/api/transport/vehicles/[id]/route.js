import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

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

    if (body.registrationNumber && body.registrationNumber !== existing.registrationNumber) {
      const dup = await prisma.vehicle.findUnique({
        where: { registrationNumber: body.registrationNumber },
      });
      if (dup) {
        return Response.json({ error: "Registration number already in use" }, { status: 400 });
      }
    }

    const vehicle = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        registrationNumber: body.registrationNumber ?? existing.registrationNumber,
        vehicleType: body.vehicleType ?? existing.vehicleType,
        make: body.make ?? existing.make,
        model: body.model ?? existing.model,
        year: body.year !== undefined ? (body.year ? parseInt(body.year) : null) : existing.year,
        capacity: body.capacity !== undefined ? parseFloat(body.capacity) || 0 : existing.capacity,
        driverName: body.driverName ?? existing.driverName,
        driverPhone: body.driverPhone ?? existing.driverPhone,
        isOwned: body.isOwned !== undefined ? Boolean(body.isOwned) : existing.isOwned,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive,
        notes: body.notes ?? existing.notes,
      },
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

    const transportCount = await prisma.transport.count({ where: { vehicleId } });
    if (transportCount > 0) {
      return Response.json(
        { error: "Cannot delete vehicle with transport history. Deactivate instead." },
        { status: 400 }
      );
    }

    await prisma.vehicle.delete({ where: { id: vehicleId } });
    return Response.json({ success: true, message: "Vehicle deleted" });
  } catch (error) {
    console.error("Delete vehicle error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

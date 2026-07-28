import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { directoryCreateBlocked, requireProjectAccountsAdmin } from "@/lib/directoryCreate";

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const vehicles = await prisma.vehicle.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { transports: true } },
      },
    });

    return Response.json({ success: true, vehicles });
  } catch (error) {
    console.error("List vehicles error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "manager")) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const blocked = directoryCreateBlocked(body);
    if (blocked) return blocked;
    const adminOnly = requireProjectAccountsAdmin(user);
    if (adminOnly) return adminOnly;

    const {
      registrationNumber,
      vehicleType,
      make,
      model,
      year,
      capacity,
      driverName,
      driverPhone,
      isOwned,
      notes,
      linkDriverAccount,
    } = body;

    if (!registrationNumber || !vehicleType) {
      return Response.json(
        { error: "Registration number and vehicle type are required" },
        { status: 400 }
      );
    }

    const existing = await prisma.vehicle.findUnique({
      where: { registrationNumber },
    });
    if (existing) {
      return Response.json({ error: "Vehicle with this registration already exists" }, { status: 400 });
    }

    const vehicle = await prisma.$transaction(async (tx) => {
      let driverAccountId = null;
      if (linkDriverAccount && driverName) {
        const driverAccount = await tx.account.create({
          data: {
            name: `${driverName} (Driver · ${registrationNumber})`,
            type: "liability",
            category: "transport",
            phone: driverPhone || null,
          },
        });
        driverAccountId = driverAccount.id;
      }

      return tx.vehicle.create({
        data: {
          registrationNumber,
          vehicleType,
          make: make || null,
          model: model || null,
          year: year ? parseInt(year) : null,
          capacity: parseFloat(capacity) || 0,
          driverName: driverName || null,
          driverPhone: driverPhone || null,
          driverAccountId,
          isOwned: isOwned !== undefined ? Boolean(isOwned) : true,
          notes: notes || null,
        },
      });
    });

    return Response.json({ success: true, vehicle }, { status: 201 });
  } catch (error) {
    console.error("Create vehicle error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

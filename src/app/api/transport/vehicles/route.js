import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { aggregateFleetExpenses } from "@/lib/fleetStats";

export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [vehicles, expenses] = await Promise.all([
      prisma.vehicle.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { transports: true, expenses: true } },
        },
      }),
      prisma.vehicleExpense.findMany({
        select: { vehicleId: true, amount: true, expenseDate: true, expenseType: true },
      }),
    ]);

    const { byVehicle, fleetMonth, fleetAllTime } = aggregateFleetExpenses(expenses);

    const vehiclesWithStats = vehicles.map((v) => ({
      ...v,
      expenseStats: byVehicle[v.id] || { total: 0, month: 0, fuel: 0, count: 0 },
    }));

    const activeCount = vehicles.filter((v) => v.isActive).length;

    return Response.json({
      success: true,
      vehicles: vehiclesWithStats,
      summary: {
        registered: vehicles.length,
        active: activeCount,
        expensesThisMonth: fleetMonth,
        allTimeCost: fleetAllTime,
      },
    });
  } catch (error) {
    console.error("List vehicles error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "manager")) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
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
    } = body;

    if (!registrationNumber?.trim()) {
      return Response.json({ error: "Registration number is required" }, { status: 400 });
    }
    if (!vehicleType?.trim()) {
      return Response.json({ error: "Vehicle type is required" }, { status: 400 });
    }

    const existing = await prisma.vehicle.findUnique({
      where: { registrationNumber: registrationNumber.trim() },
    });
    if (existing) {
      return Response.json({ error: "Vehicle with this registration already exists" }, { status: 400 });
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        registrationNumber: registrationNumber.trim(),
        vehicleType: vehicleType.trim(),
        make: make?.trim() || null,
        model: model?.trim() || null,
        year: year ? parseInt(year, 10) : null,
        capacity: parseFloat(capacity) || 0,
        driverName: driverName?.trim() || null,
        driverPhone: driverPhone?.trim() || null,
        isOwned: isOwned !== undefined ? Boolean(isOwned) : true,
        notes: notes?.trim() || null,
      },
    });

    return Response.json({ success: true, vehicle }, { status: 201 });
  } catch (error) {
    console.error("Create vehicle error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

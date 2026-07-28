import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const dateFilter = {};
    if (from || to) {
      dateFilter.createdAt = {};
      if (from) dateFilter.createdAt.gte = new Date(from);
      if (to) dateFilter.createdAt.lte = new Date(to);
    }

    const [transports, vehicles, vehicleExpenseAgg] = await Promise.all([
      prisma.transport.findMany({
        where: { status: { not: "cancelled" }, ...dateFilter },
        include: { vehicle: { select: { id: true, registrationNumber: true, vehicleType: true } } },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.vehicle.findMany({ select: { id: true, registrationNumber: true, vehicleType: true, isActive: true, isOwned: true } }),
      prisma.vehicleExpense.aggregate({ _sum: { amount: true } }),
    ]);

    const totalCharges = transports.reduce((s, t) => s + (t.totalCharges || 0), 0);
    const totalPaid = transports.reduce((s, t) => s + (t.paidAmount || 0), 0);
    const totalLoadWeight = transports.reduce((s, t) => s + (t.loadWeight || 0), 0);

    // Utilization per vehicle
    const usageByVehicle = {};
    transports.forEach((t) => {
      const key = t.vehicleId || t.vehicleNumber || "unassigned";
      if (!usageByVehicle[key]) {
        usageByVehicle[key] = {
          vehicleId: t.vehicleId,
          registrationNumber: t.vehicle?.registrationNumber || t.vehicleNumber || "Unassigned",
          trips: 0,
          totalCharges: 0,
          totalLoadWeight: 0,
        };
      }
      usageByVehicle[key].trips += 1;
      usageByVehicle[key].totalCharges += t.totalCharges || 0;
      usageByVehicle[key].totalLoadWeight += t.loadWeight || 0;
    });

    return Response.json({
      success: true,
      summary: {
        count: transports.length,
        totalCharges,
        totalPaid,
        outstanding: totalCharges - totalPaid,
        totalLoadWeight,
        totalVehicles: vehicles.length,
        activeVehicles: vehicles.filter((v) => v.isActive).length,
        vehicleExpenses: vehicleExpenseAgg._sum.amount || 0,
      },
      transports,
      vehicleUtilization: Object.values(usageByVehicle).sort((a, b) => b.trips - a.trips),
    });
  } catch (error) {
    console.error("Transport report error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

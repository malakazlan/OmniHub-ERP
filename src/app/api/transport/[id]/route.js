import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const transportId = parseInt(id);

    const transport = await prisma.transport.findUnique({
      where: { id: transportId },
      include: {
        vehicle: true,
        purchaseOrders: { select: { id: true, purchaseNumber: true } },
        saleOrders: { select: { id: true, invoiceNumber: true } },
      },
    });

    if (!transport) {
      return Response.json({ error: "Transport not found" }, { status: 404 });
    }

    return Response.json({ success: true, transport });
  } catch (error) {
    console.error("Fetch transport error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const transportId = parseInt(id);
    const body = await req.json();

    const existing = await prisma.transport.findUnique({
      where: { id: transportId },
    });

    if (!existing) {
      return Response.json({ error: "Transport not found" }, { status: 404 });
    }

    const freight = parseFloat(body.freightCharges ?? existing.freightCharges) || 0;
    const loading = parseFloat(body.loadingCharges ?? existing.loadingCharges) || 0;
    const unloading = parseFloat(body.unloadingCharges ?? existing.unloadingCharges) || 0;
    const toll = parseFloat(body.tollCharges ?? existing.tollCharges) || 0;
    const other = parseFloat(body.otherCharges ?? existing.otherCharges) || 0;
    const totalCharges = freight + loading + unloading + toll + other;

    let resolvedVehicleNumber = body.vehicleNumber ?? existing.vehicleNumber;
    const vehicleId = body.vehicleId !== undefined
      ? (body.vehicleId ? parseInt(body.vehicleId) : null)
      : existing.vehicleId;

    if (vehicleId) {
      const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
      if (vehicle) resolvedVehicleNumber = vehicle.registrationNumber;
    }

    const transport = await prisma.transport.update({
      where: { id: transportId },
      data: {
        vehicleId,
        vehicleNumber: resolvedVehicleNumber,
        driverName: body.driverName ?? existing.driverName,
        driverPhone: body.driverPhone ?? existing.driverPhone,
        originCity: body.originCity ?? existing.originCity,
        originAddress: body.originAddress ?? existing.originAddress,
        destinationCity: body.destinationCity ?? existing.destinationCity,
        destinationAddress: body.destinationAddress ?? existing.destinationAddress,
        loadWeight: body.loadWeight !== undefined ? parseFloat(body.loadWeight) || 0 : existing.loadWeight,
        loadDescription: body.loadDescription ?? existing.loadDescription,
        freightCharges: freight,
        loadingCharges: loading,
        unloadingCharges: unloading,
        tollCharges: toll,
        otherCharges: other,
        totalCharges,
        paidAmount: body.paidAmount !== undefined ? parseFloat(body.paidAmount) || 0 : existing.paidAmount,
        paymentStatus: body.paymentStatus ?? existing.paymentStatus,
        status: body.status ?? existing.status,
        dispatchDate: body.dispatchDate ? new Date(body.dispatchDate) : existing.dispatchDate,
        deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : existing.deliveryDate,
        notes: body.notes ?? existing.notes,
      },
      include: { vehicle: true },
    });

    return Response.json({ success: true, transport });
  } catch (error) {
    console.error("Update transport error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

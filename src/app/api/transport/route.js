import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { generateDocumentNumber } from "@/lib/receipt";

export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where = status ? { status } : {};

    const transports = await prisma.transport.findMany({
      where,
      include: {
        vehicle: {
          select: {
            id: true,
            registrationNumber: true,
            vehicleType: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json({ success: true, transports });
  } catch (error) {
    console.error("List transports error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      vehicleId,
      vehicleNumber,
      driverName,
      driverPhone,
      originCity,
      originAddress,
      destinationCity,
      destinationAddress,
      loadWeight,
      loadDescription,
      freightCharges,
      loadingCharges,
      unloadingCharges,
      tollCharges,
      otherCharges,
      status,
      dispatchDate,
      deliveryDate,
      notes,
    } = body;

    if (!driverName || !originCity || !destinationCity) {
      return Response.json(
        { error: "Driver name, origin city, and destination city are required" },
        { status: 400 }
      );
    }

    const transportNumber = await generateDocumentNumber("transport");

    const freight = parseFloat(freightCharges) || 0;
    const loading = parseFloat(loadingCharges) || 0;
    const unloading = parseFloat(unloadingCharges) || 0;
    const toll = parseFloat(tollCharges) || 0;
    const other = parseFloat(otherCharges) || 0;
    const totalCharges = freight + loading + unloading + toll + other;

    let resolvedVehicleNumber = vehicleNumber || null;
    if (vehicleId) {
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: parseInt(vehicleId) },
      });
      if (vehicle) {
        resolvedVehicleNumber = vehicle.registrationNumber;
      }
    }

    const transport = await prisma.transport.create({
      data: {
        transportNumber,
        vehicleId: vehicleId ? parseInt(vehicleId) : null,
        vehicleNumber: resolvedVehicleNumber,
        driverName,
        driverPhone: driverPhone || null,
        originCity,
        originAddress: originAddress || null,
        destinationCity,
        destinationAddress: destinationAddress || null,
        loadWeight: parseFloat(loadWeight) || 0,
        loadDescription: loadDescription || null,
        freightCharges: freight,
        loadingCharges: loading,
        unloadingCharges: unloading,
        tollCharges: toll,
        otherCharges: other,
        totalCharges,
        status: status || "pending",
        dispatchDate: dispatchDate ? new Date(dispatchDate) : null,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        notes: notes || null,
      },
      include: {
        vehicle: true,
      },
    });

    return Response.json({ success: true, transport }, { status: 201 });
  } catch (error) {
    console.error("Create transport error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

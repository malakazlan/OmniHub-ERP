import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { generateDocumentNumber } from "@/lib/receipt";

function canManageSales(user) {
  return user && (user.role === "admin" || user.role === "manager" || user.role === "salesperson");
}

export async function POST(req) {
  try {
    const user = getUserFromRequest(req);
    if (!canManageSales(user)) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { saleOrderId, driverName, vehicleNumber, notes } = await req.json();

    if (!saleOrderId) {
      return Response.json({ error: "Sale order ID is required" }, { status: 400 });
    }
    if (!driverName) {
      return Response.json({ error: "Driver name is required" }, { status: 400 });
    }
    if (!vehicleNumber) {
      return Response.json({ error: "Vehicle number is required" }, { status: 400 });
    }

    const saleId = parseInt(saleOrderId, 10);

    const sale = await prisma.saleOrder.findUnique({
      where: { id: saleId },
      include: { gatePass: true },
    });

    if (!sale) {
      return Response.json({ error: "Sale order not found" }, { status: 404 });
    }

    if (sale.status === "draft" || sale.status === "cancelled") {
      return Response.json({ error: "Sale must be confirmed before generating a gate pass" }, { status: 400 });
    }

    if (sale.gatePass) {
      return Response.json({ error: "Gate pass already generated for this sale" }, { status: 400 });
    }

    const gatePassNumber = await generateDocumentNumber("gatePass");

    const result = await prisma.$transaction(async (tx) => {
      const gatePass = await tx.gatePass.create({
        data: {
          saleOrderId: saleId,
          gatePassNumber,
          driverName,
          vehicleNumber,
          notes: notes || null,
        },
      });

      const updatedSale = await tx.saleOrder.update({
        where: { id: saleId },
        data: {
          gatePassGenerated: true,
          status: "dispatched",
          driverName,
          vehicleNumber,
        },
        include: {
          items: true,
          gatePass: true,
          company: { select: { id: true, name: true } },
          shop: { select: { id: true, name: true } },
        },
      });

      return { gatePass, sale: updatedSale };
    });

    return Response.json({ success: true, ...result }, { status: 201 });
  } catch (error) {
    console.error("Generate gate pass error:", error);
    if (error.code === "P2002") {
      return Response.json({ error: "Gate pass already exists for this sale" }, { status: 400 });
    }
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

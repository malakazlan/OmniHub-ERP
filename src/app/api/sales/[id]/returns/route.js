import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { generateDocumentNumber } from "@/lib/receipt";
import { createLedgerEntry } from "@/lib/ledger";
import { logActivity } from "@/lib/activityLog";
import { normalizeItems, computeItemSubtotal } from "@/lib/order-processing";

function canManageSales(user) {
  return user && (user.role === "admin" || user.role === "manager" || user.role === "salesperson");
}

export async function GET(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const saleId = parseInt(id, 10);

    const returns = await prisma.saleReturn.findMany({
      where: { originalSaleId: saleId },
      orderBy: { returnDate: "desc" },
    });

    const parsed = returns.map((r) => ({ ...r, items: JSON.parse(r.items || "[]") }));

    return Response.json({ success: true, returns: parsed });
  } catch (error) {
    console.error("List sale returns error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!canManageSales(user)) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const saleId = parseInt(id, 10);
    const body = await req.json();

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return Response.json({ error: "At least one item is required" }, { status: 400 });
    }

    const sale = await prisma.saleOrder.findUnique({ where: { id: saleId } });
    if (!sale) return Response.json({ error: "Sale not found" }, { status: 404 });

    if (sale.status === "draft" || sale.status === "cancelled") {
      return Response.json({ error: "Only confirmed/dispatched/delivered sales can have returns" }, { status: 400 });
    }

    const items = normalizeItems(body.items);
    const returnAmount = computeItemSubtotal(items);
    const returnDate = body.returnDate ? new Date(body.returnDate) : new Date();
    const returnNumber = await generateDocumentNumber("saleReturn", returnDate);

    const result = await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new Error(`Product ${item.productId} not found`);

        const previousStock = product.currentStock;
        const newStock = previousStock + item.quantity;

        await tx.product.update({ where: { id: item.productId }, data: { currentStock: newStock } });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            movementType: "return_in",
            quantity: item.quantity,
            previousStock,
            newStock,
            referenceType: "SaleReturn",
            referenceId: saleId,
            notes: `Return against ${sale.invoiceNumber}`,
          },
        });
      }

      const saleReturn = await tx.saleReturn.create({
        data: {
          returnNumber,
          originalSaleId: saleId,
          returnDate,
          items: JSON.stringify(items),
          returnAmount,
          reason: body.reason || null,
          notes: body.notes || null,
        },
      });

      if (sale.customerAccountId) {
        await createLedgerEntry(tx, {
          accountId: sale.customerAccountId,
          date: returnDate,
          description: `Sale return ${returnNumber}`,
          reference: returnNumber,
          referenceType: "SaleReturn",
          referenceId: saleReturn.id,
          credit: returnAmount,
        });
      }

      return saleReturn;
    });

    logActivity({
      userId: user.userId,
      action: "CREATE",
      module: "sales",
      entityType: "SaleReturn",
      entityId: result.id,
      details: { returnNumber, returnAmount, invoiceNumber: sale.invoiceNumber },
      req,
    });

    return Response.json({ success: true, return: { ...result, items } }, { status: 201 });
  } catch (error) {
    console.error("Create sale return error:", error);
    if (error.message?.includes("not found")) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

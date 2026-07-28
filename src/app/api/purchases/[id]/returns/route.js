import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { generateDocumentNumber } from "@/lib/receipt";
import { createLedgerEntry } from "@/lib/ledger";
import { logActivity } from "@/lib/activityLog";
import { normalizeItems, computeItemSubtotal } from "@/lib/order-processing";

function canManagePurchases(user) {
  return user && (user.role === "admin" || user.role === "manager");
}

export async function GET(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const purchaseId = parseInt(id, 10);

    const returns = await prisma.purchaseReturn.findMany({
      where: { originalPurchaseId: purchaseId },
      orderBy: { returnDate: "desc" },
    });

    const parsed = returns.map((r) => ({ ...r, items: JSON.parse(r.items || "[]") }));

    return Response.json({ success: true, returns: parsed });
  } catch (error) {
    console.error("List purchase returns error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!canManagePurchases(user)) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const purchaseId = parseInt(id, 10);
    const body = await req.json();

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return Response.json({ error: "At least one item is required" }, { status: 400 });
    }

    const purchase = await prisma.purchaseOrder.findUnique({ where: { id: purchaseId } });
    if (!purchase) return Response.json({ error: "Purchase not found" }, { status: 404 });

    if (purchase.status === "draft" || purchase.status === "cancelled") {
      return Response.json({ error: "Only confirmed/received purchases can have returns" }, { status: 400 });
    }

    const items = normalizeItems(body.items);
    const returnAmount = computeItemSubtotal(items);
    const returnDate = body.returnDate ? new Date(body.returnDate) : new Date();
    const returnNumber = await generateDocumentNumber("purchaseReturn", returnDate);

    const result = await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new Error(`Product ${item.productId} not found`);
        if (product.currentStock < item.quantity) {
          throw new Error(`Insufficient stock to return ${product.name}. Available: ${product.currentStock}`);
        }

        const previousStock = product.currentStock;
        const newStock = previousStock - item.quantity;

        await tx.product.update({ where: { id: item.productId }, data: { currentStock: newStock } });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            movementType: "return_out",
            quantity: item.quantity,
            previousStock,
            newStock,
            referenceType: "PurchaseReturn",
            referenceId: purchaseId,
            notes: `Return against ${purchase.purchaseNumber}`,
          },
        });
      }

      const purchaseReturn = await tx.purchaseReturn.create({
        data: {
          returnNumber,
          originalPurchaseId: purchaseId,
          returnDate,
          items: JSON.stringify(items),
          returnAmount,
          reason: body.reason || null,
          notes: body.notes || null,
        },
      });

      if (purchase.vendorAccountId) {
        await createLedgerEntry(tx, {
          accountId: purchase.vendorAccountId,
          date: returnDate,
          description: `Purchase return ${returnNumber}`,
          reference: returnNumber,
          referenceType: "PurchaseReturn",
          referenceId: purchaseReturn.id,
          debit: returnAmount,
        });
      }

      return purchaseReturn;
    });

    logActivity({
      userId: user.userId,
      action: "CREATE",
      module: "purchases",
      entityType: "PurchaseReturn",
      entityId: result.id,
      details: { returnNumber, returnAmount, purchaseNumber: purchase.purchaseNumber },
      req,
    });

    return Response.json({ success: true, return: { ...result, items } }, { status: 201 });
  } catch (error) {
    console.error("Create purchase return error:", error);
    if (error.message?.includes("not found") || error.message?.includes("Insufficient")) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { generateDocumentNumber } from "@/lib/receipt";
import { createLedgerEntry } from "@/lib/ledger";
import { logActivity } from "@/lib/activityLog";
import { normalizeItems, computeItemSubtotal, parseNum } from "@/lib/order-processing";
import { resolveUserCashAccountId, assertUserCanUseCashAccount } from "@/lib/userCashAccount";
import {
  aggregateReturnedQuantities,
  validatePurchaseReturnItems,
  computeMaxReturnRefundBeforeReturn,
} from "@/lib/purchaseReturn";
import {
  applyPurchaseReturnToOrder,
  applyPurchaseReturnRefund,
} from "@/lib/purchaseReturnServer";

/** Stock and ledger flows run long interactive transactions; allow up to 60s on serverless hosts. */
export const maxDuration = 60;

function canManagePurchases(user) {
  return user && (user.role === "admin" || user.role === "manager");
}

export async function GET(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const purchaseId = parseInt(id, 10);

    const returns = await prisma.purchaseReturn.findMany({
      where: { originalPurchaseId: purchaseId },
      orderBy: { returnDate: "desc" },
    });

    const parsed = returns.map((r) => ({ ...r, items: JSON.parse(r.items || "[]") }));
    const totalReturned = parsed.reduce((sum, row) => sum + (row.returnAmount || 0), 0);

    return Response.json({ success: true, returns: parsed, totalReturned });
  } catch (error) {
    console.error("List purchase returns error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    if (!canManagePurchases(user)) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const purchaseId = parseInt(id, 10);
    const body = await req.json();

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return Response.json({ error: "At least one item is required" }, { status: 400 });
    }

    const purchase = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseId },
      include: { items: true },
    });
    if (!purchase) return Response.json({ error: "Purchase not found" }, { status: 404 });

    if (purchase.status === "draft" || purchase.status === "cancelled") {
      return Response.json({ error: "Only confirmed/received purchases can have returns" }, { status: 400 });
    }

    const items = normalizeItems(body.items);
    const returnAmount = computeItemSubtotal(items);
    if (returnAmount <= 0) {
      return Response.json({ error: "Return amount must be greater than zero" }, { status: 400 });
    }

    const refundCashAmount = parseNum(body.refundCashAmount ?? body.cashAmount);
    const refundBankAmount = parseNum(body.refundBankAmount ?? body.bankAmount);
    const refundTotal = refundCashAmount + refundBankAmount;

    const existingReturns = await prisma.purchaseReturn.findMany({
      where: { originalPurchaseId: purchaseId },
    });
    const priorReturned = aggregateReturnedQuantities(existingReturns);

    const products = await prisma.product.findMany({
      where: { id: { in: items.map((item) => item.productId) } },
      select: { id: true, currentStock: true },
    });
    const stockByProductId = Object.fromEntries(
      products.map((product) => [product.id, product.currentStock])
    );

    try {
      validatePurchaseReturnItems(purchase.items, priorReturned, items, stockByProductId);
    } catch (validationError) {
      return Response.json({ error: validationError.message }, { status: 400 });
    }

    const maxRefund = computeMaxReturnRefundBeforeReturn(purchase, returnAmount);
    if (refundTotal > maxRefund + 0.01) {
      return Response.json(
        {
          error:
            maxRefund <= 0
              ? "No refund available — nothing has been overpaid on this bill"
              : `Refund cannot exceed ${maxRefund.toFixed(2)} for this return`,
        },
        { status: 400 }
      );
    }

    let refundCashAccountId = body.refundCashAccountId
      ? parseInt(body.refundCashAccountId, 10)
      : body.cashAccountId
        ? parseInt(body.cashAccountId, 10)
        : purchase.cashAccountId;
    const refundBankAccountId = body.refundBankAccountId
      ? parseInt(body.refundBankAccountId, 10)
      : body.bankAccountId
        ? parseInt(body.bankAccountId, 10)
        : purchase.bankAccountId;

    if (refundCashAmount > 0) {
      if (!refundCashAccountId) {
        const userCash = await resolveUserCashAccountId(prisma, user.userId);
        if (userCash) refundCashAccountId = userCash;
      }
      try {
        await assertUserCanUseCashAccount(prisma, user, refundCashAccountId);
      } catch (err) {
        return Response.json({ error: err.message }, { status: 403 });
      }
      if (!refundCashAccountId) {
        return Response.json({ error: "Select a cash account for this refund" }, { status: 400 });
      }
    }

    if (refundBankAmount > 0 && !refundBankAccountId) {
      return Response.json({ error: "Select a bank account for this refund" }, { status: 400 });
    }

    const returnDate = body.returnDate ? new Date(body.returnDate) : new Date();
    const returnNumber = await generateDocumentNumber("purchaseReturn", returnDate);

    const result = await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new Error(`Item ${item.productId} not found`);

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
          description: `Purchase return ${returnNumber} · ${purchase.purchaseNumber}`,
          reference: returnNumber,
          referenceType: "PurchaseReturn",
          referenceId: purchaseReturn.id,
          debit: returnAmount,
        });
      }

      let updatedPurchase = await applyPurchaseReturnToOrder(tx, {
        purchase,
        purchaseItems: purchase.items,
      });

      if (refundTotal > 0) {
        updatedPurchase = await applyPurchaseReturnRefund(tx, {
          purchase,
          purchaseReturn,
          returnDate,
          cashAmount: refundCashAmount,
          bankAmount: refundBankAmount,
          cashAccountId: refundCashAccountId,
          bankAccountId: refundBankAccountId,
          newTotalAmount: updatedPurchase.totalAmount,
        });
      }

      return { purchaseReturn, updatedPurchase };
    });

    logActivity({
      userId: user.userId,
      action: "CREATE",
      module: "purchases",
      entityType: "PurchaseReturn",
      entityId: result.purchaseReturn.id,
      details: {
        returnNumber,
        returnAmount,
        refundCashAmount,
        refundBankAmount,
        purchaseNumber: purchase.purchaseNumber,
        newTotalAmount: result.updatedPurchase.totalAmount,
        paymentStatus: result.updatedPurchase.paymentStatus,
      },
      req,
    });

    return Response.json(
      {
        success: true,
        return: { ...result.purchaseReturn, items },
        purchase: result.updatedPurchase,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create purchase return error:", error);
    if (
      error.message?.includes("not found") ||
      error.message?.includes("Insufficient") ||
      error.message?.includes("exceeds") ||
      error.message?.includes("Refund") ||
      error.message?.includes("account")
    ) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

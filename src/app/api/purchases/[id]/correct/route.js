import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";
import { correctPurchaseBill, getPurchaseCorrectionMeta } from "@/lib/purchaseCorrection";

function canCorrectPurchases(user) {
  return user && (user.role === "admin" || user.role === "manager");
}

export async function GET(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const purchaseId = parseInt(id, 10);

    const purchase = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseId },
      include: {
        items: { include: { product: { select: { id: true, name: true, sku: true, unit: true } } } },
        returns: true,
      },
    });

    if (!purchase) return Response.json({ error: "Purchase not found" }, { status: 404 });

    const meta = getPurchaseCorrectionMeta(purchase, purchase.returns?.length || 0);

    return Response.json({
      success: true,
      canCorrect: meta.ok && canCorrectPurchases(user),
      reason: meta.ok ? null : meta.reason,
      roleAllowed: canCorrectPurchases(user),
      purchase,
    });
  } catch (error) {
    console.error("Purchase correction meta error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!canCorrectPurchases(user)) {
      return Response.json({ error: "Only admin or manager can correct posted bills" }, { status: 403 });
    }

    const { id } = await params;
    const purchaseId = parseInt(id, 10);
    const body = await req.json();

    const before = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseId },
      select: { purchaseNumber: true, totalAmount: true, paidAmount: true },
    });

    const purchase = await prisma.$transaction((tx) =>
      correctPurchaseBill(tx, {
        purchaseId,
        body,
        userName: user.name || user.email || user.userId,
      })
    );

    logActivity({
      userId: user.userId,
      action: "CORRECT",
      module: "purchases",
      entityType: "PurchaseOrder",
      entityId: purchaseId,
      details: {
        purchaseNumber: purchase.purchaseNumber,
        reason: body.correctionReason,
        beforeTotal: before?.totalAmount,
        afterTotal: purchase.totalAmount,
        beforePaid: before?.paidAmount,
        afterPaid: purchase.paidAmount,
      },
      req,
    });

    return Response.json({ success: true, purchase });
  } catch (error) {
    console.error("Correct purchase error:", error);
    if (
      error.message?.includes("not found") ||
      error.message?.includes("Insufficient") ||
      error.message?.includes("cannot") ||
      error.message?.includes("required") ||
      error.message?.includes("returns")
    ) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return Response.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

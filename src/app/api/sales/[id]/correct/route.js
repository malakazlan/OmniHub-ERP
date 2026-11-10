import prisma, { runTransaction } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";
import { correctSaleBill, getSaleCorrectionMeta } from "@/lib/saleCorrection";
import { normalizeSaleReturns } from "@/lib/saleReturn";

/** Stock and ledger flows run long interactive transactions; allow up to 60s on serverless hosts. */
export const maxDuration = 60;

function canCorrectSales(user) {
  return user && (user.role === "admin" || user.role === "manager");
}

export async function GET(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const saleId = parseInt(id, 10);

    const sale = await prisma.saleOrder.findUnique({
      where: { id: saleId },
      include: {
        items: { include: { product: { select: { id: true, name: true, sku: true, unit: true } } } },
        returns: true,
      },
    });

    if (!sale) return Response.json({ error: "Sale not found" }, { status: 404 });

    const meta = getSaleCorrectionMeta(sale, sale.returns?.length || 0);

    return Response.json({
      success: true,
      canCorrect: meta.ok && canCorrectSales(user),
      reason: meta.ok ? null : meta.reason,
      roleAllowed: canCorrectSales(user),
      sale: {
        ...sale,
        returns: normalizeSaleReturns(sale.returns || []),
      },
    });
  } catch (error) {
    console.error("Sale correction meta error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    if (!canCorrectSales(user)) {
      return Response.json({ error: "Only admin or manager can correct posted bills" }, { status: 403 });
    }

    const { id } = await params;
    const saleId = parseInt(id, 10);
    const body = await req.json();

    const before = await prisma.saleOrder.findUnique({
      where: { id: saleId },
      select: { invoiceNumber: true, totalAmount: true, paidAmount: true },
    });

    const sale = await runTransaction((tx) =>
      correctSaleBill(tx, {
        saleId,
        body,
        userName: user.name || user.email || user.userId,
      })
    );

    logActivity({
      userId: user.userId,
      action: "CORRECT",
      module: "sales",
      entityType: "SaleOrder",
      entityId: saleId,
      details: {
        invoiceNumber: sale.invoiceNumber,
        reason: body.correctionReason,
        beforeTotal: before?.totalAmount,
        afterTotal: sale.totalAmount,
        beforePaid: before?.paidAmount,
        afterPaid: sale.paidAmount,
      },
      req,
    });

    return Response.json({ success: true, sale });
  } catch (error) {
    console.error("Correct sale error:", error);
    if (error.message?.includes("not found") || error.message?.includes("Insufficient") || error.message?.includes("cannot") || error.message?.includes("required") || error.message?.includes("returns")) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return Response.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

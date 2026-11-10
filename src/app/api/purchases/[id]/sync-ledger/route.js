import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { shouldApplyPurchaseEffects, syncPurchasePaymentLedgerLegs } from "@/lib/order-processing";

/** Stock and ledger flows run long interactive transactions; allow up to 60s on serverless hosts. */
export const maxDuration = 60;

function canManage(user) {
  return user && (user.role === "admin" || user.role === "manager");
}

/** Backfill missing cash/bank ledger legs for an existing confirmed purchase. */
export async function POST(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    if (!canManage(user)) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const purchaseId = parseInt(id, 10);

    const purchase = await prisma.purchaseOrder.findUnique({ where: { id: purchaseId } });
    if (!purchase) {
      return Response.json({ error: "Purchase not found" }, { status: 404 });
    }

    if (!shouldApplyPurchaseEffects(purchase.status)) {
      return Response.json({ error: "Purchase is not confirmed" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const ledgerAccounts = await syncPurchasePaymentLedgerLegs(tx, purchase);
      return tx.purchaseOrder.update({
        where: { id: purchaseId },
        data: {
          cashAccountId: ledgerAccounts.cashAccountId ?? purchase.cashAccountId,
          bankAccountId: ledgerAccounts.bankAccountId ?? purchase.bankAccountId,
        },
        include: {
          items: true,
          farmer: { select: { id: true, name: true, phone: true } },
          company: { select: { id: true, name: true, phone: true } },
        },
      });
    });

    return Response.json({ success: true, purchase: updated, message: "Ledger synced" });
  } catch (error) {
    console.error("Sync purchase ledger error:", error);
    return Response.json({ error: error.message || "Internal Server Error" }, { status: 400 });
  }
}

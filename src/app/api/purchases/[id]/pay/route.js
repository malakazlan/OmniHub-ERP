import prisma, { runTransaction } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import {
  parseNum,
  computePaymentStatus,
  shouldApplyPurchaseEffects,
  applyPurchaseAdditionalPayment,
  syncPurchasePaymentLedgerLegs,
} from "@/lib/order-processing";
import { logActivity } from "@/lib/activityLog";
import { resolveUserCashAccountId, assertUserCanUseCashAccount } from "@/lib/userCashAccount";

function canManagePurchases(user) {
  return user && (user.role === "admin" || user.role === "manager");
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

    const cashAmount = parseNum(body.cashAmount);
    const bankAmount = parseNum(body.bankAmount);
    const totalPay = cashAmount + bankAmount;

    if (totalPay <= 0) {
      return Response.json({ error: "Enter a cash or bank payment amount" }, { status: 400 });
    }

    const existing = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseId },
    });

    if (!existing) {
      return Response.json({ error: "Purchase not found" }, { status: 404 });
    }

    if (!shouldApplyPurchaseEffects(existing.status)) {
      return Response.json(
        { error: "Confirm this purchase before recording payments" },
        { status: 400 }
      );
    }

    const balance = Math.max((existing.totalAmount || 0) - (existing.paidAmount || 0), 0);
    if (totalPay > balance + 0.01) {
      return Response.json(
        { error: `Payment exceeds balance due (${balance.toFixed(2)})` },
        { status: 400 }
      );
    }

    const paymentDate = body.paymentDate ? new Date(body.paymentDate) : new Date();
    let cashAccountId = body.cashAccountId ? parseInt(body.cashAccountId, 10) : existing.cashAccountId;
    const bankAccountId = body.bankAccountId ? parseInt(body.bankAccountId, 10) : existing.bankAccountId;

    if (cashAmount > 0) {
      if (!cashAccountId) {
        const userCash = await resolveUserCashAccountId(prisma, user.userId);
        if (userCash) cashAccountId = userCash;
      }
      try {
        await assertUserCanUseCashAccount(prisma, user, cashAccountId);
      } catch (err) {
        return Response.json({ error: err.message }, { status: 403 });
      }
    }

    const purchase = await runTransaction(async (tx) => {
      const orderForLedger = {
        ...existing,
        cashAccountId: cashAccountId || existing.cashAccountId,
        bankAccountId: bankAccountId || existing.bankAccountId,
      };

      const resolved = await applyPurchaseAdditionalPayment(tx, orderForLedger, {
        cashDelta: cashAmount,
        bankDelta: bankAmount,
        paymentDate,
      });

      const newCash = (existing.cashAmount || 0) + cashAmount;
      const newBank = (existing.bankAmount || 0) + bankAmount;
      const newPaid = newCash + newBank;
      const paymentStatus = computePaymentStatus(newPaid, existing.totalAmount);

      const updated = await tx.purchaseOrder.update({
        where: { id: purchaseId },
        data: {
          cashAmount: newCash,
          bankAmount: newBank,
          paidAmount: newPaid,
          paymentStatus,
          cashAccountId: resolved?.cashAccountId || cashAccountId || existing.cashAccountId,
          bankAccountId: resolved?.bankAccountId || bankAccountId || existing.bankAccountId,
        },
        include: {
          items: true,
          farmer: { select: { id: true, name: true, phone: true } },
          company: { select: { id: true, name: true, phone: true } },
        },
      });

      await syncPurchasePaymentLedgerLegs(tx, updated);

      return updated;
    });

    logActivity({
      userId: user.userId,
      action: "UPDATE",
      module: "purchases",
      entityType: "PurchaseOrder",
      entityId: purchase.id,
      details: { action: "payment", cashAmount, bankAmount, paymentStatus: purchase.paymentStatus },
      req,
    });

    return Response.json({ success: true, purchase });
  } catch (error) {
    console.error("Purchase payment error:", error);
    if (error.message?.includes("account")) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import prisma, { runTransaction } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import {
  parseNum,
  computePaymentStatus,
  applyPurchaseAdditionalPayment,
  syncPurchasePaymentLedgerLegs,
} from "@/lib/order-processing";
import {
  planFifoPurchaseSettlement,
  purchaseBalanceDue,
} from "@/lib/purchase-settlement";
import { logActivity } from "@/lib/activityLog";
import { resolveUserCashAccountId, assertUserCanUseCashAccount } from "@/lib/userCashAccount";

/** Stock and ledger flows run long interactive transactions; allow up to 60s on serverless hosts. */
export const maxDuration = 60;

function canManagePurchases(user) {
  return user && (user.role === "admin" || user.role === "manager");
}

export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!canManagePurchases(user)) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const vendorAccountId = parseInt(body.vendorAccountId, 10);
    const cashAmount = parseNum(body.cashAmount);
    const bankAmount = parseNum(body.bankAmount);
    const totalPay = cashAmount + bankAmount;

    if (!vendorAccountId) {
      return Response.json({ error: "Vendor account is required" }, { status: 400 });
    }
    if (totalPay <= 0) {
      return Response.json({ error: "Enter a cash or bank payment amount" }, { status: 400 });
    }

    const vendorAccount = await prisma.account.findUnique({
      where: { id: vendorAccountId },
      select: { id: true, name: true, category: true },
    });
    if (!vendorAccount) {
      return Response.json({ error: "Vendor account not found" }, { status: 404 });
    }

    const outstanding = await prisma.purchaseOrder.findMany({
      where: {
        vendorAccountId,
        status: { in: ["confirmed", "received"] },
        paymentStatus: { in: ["unpaid", "partial"] },
      },
      orderBy: [{ purchaseDate: "asc" }, { id: "asc" }],
    });

    if (outstanding.length === 0) {
      return Response.json({ error: "No outstanding purchase bills for this account" }, { status: 400 });
    }

    const totalDue = outstanding.reduce((sum, p) => sum + purchaseBalanceDue(p), 0);
    if (totalPay > totalDue + 0.01) {
      return Response.json(
        { error: `Payment exceeds total outstanding (${totalDue.toFixed(2)})` },
        { status: 400 }
      );
    }

    const { allocations, unapplied } = planFifoPurchaseSettlement(
      outstanding,
      cashAmount,
      bankAmount
    );

    if (allocations.length === 0) {
      return Response.json({ error: "Nothing to settle with this payment" }, { status: 400 });
    }
    if (unapplied > 0.01) {
      return Response.json(
        { error: "Payment could not be fully allocated — check amounts" },
        { status: 400 }
      );
    }

    const paymentDate = body.paymentDate ? new Date(body.paymentDate) : new Date();
    let cashAccountId = body.cashAccountId ? parseInt(body.cashAccountId, 10) : null;
    const bankAccountId = body.bankAccountId ? parseInt(body.bankAccountId, 10) : null;

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

    const result = await runTransaction(async (tx) => {
      const updatedPurchases = [];

      for (const alloc of allocations) {
        const existing = await tx.purchaseOrder.findUnique({
          where: { id: alloc.purchaseId },
        });
        if (!existing) continue;

        const balance = purchaseBalanceDue(existing);
        const payTotal = alloc.cashAmount + alloc.bankAmount;
        if (payTotal > balance + 0.01) {
          throw new Error(`Bill ${existing.purchaseNumber} balance changed — refresh and try again`);
        }

        const orderForLedger = {
          ...existing,
          cashAccountId: cashAccountId || existing.cashAccountId,
          bankAccountId: bankAccountId || existing.bankAccountId,
        };

        const resolved = await applyPurchaseAdditionalPayment(tx, orderForLedger, {
          cashDelta: alloc.cashAmount,
          bankDelta: alloc.bankAmount,
          paymentDate,
        });

        const newCash = (existing.cashAmount || 0) + alloc.cashAmount;
        const newBank = (existing.bankAmount || 0) + alloc.bankAmount;
        const newPaid = newCash + newBank;
        const paymentStatus = computePaymentStatus(newPaid, existing.totalAmount);

        const updated = await tx.purchaseOrder.update({
          where: { id: alloc.purchaseId },
          data: {
            cashAmount: newCash,
            bankAmount: newBank,
            paidAmount: newPaid,
            paymentStatus,
            cashAccountId: resolved?.cashAccountId || cashAccountId || existing.cashAccountId,
            bankAccountId: resolved?.bankAccountId || bankAccountId || existing.bankAccountId,
          },
        });

        await syncPurchasePaymentLedgerLegs(tx, updated);
        updatedPurchases.push(updated);
      }

      return updatedPurchases;
    });

    logActivity({
      userId: user.userId,
      action: "UPDATE",
      module: "purchases",
      entityType: "PurchaseOrder",
      entityId: vendorAccountId,
      details: {
        action: "fifo_settlement",
        vendorAccountId,
        cashAmount,
        bankAmount,
        billsCleared: allocations.length,
        purchaseIds: allocations.map((a) => a.purchaseId),
      },
      req,
    });

    return Response.json({
      success: true,
      allocations,
      purchases: result,
      vendorAccount,
    });
  } catch (error) {
    console.error("Purchase FIFO settlement error:", error);
    if (error.message?.includes("account") || error.message?.includes("Bill")) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

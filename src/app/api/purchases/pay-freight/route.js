import prisma, { runTransaction } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { parseNum } from "@/lib/order-processing";
import { findOutstandingPurchasesForLedgerAccount } from "@/lib/purchase-settlement";
import {
  planFifoFreightSettlement,
  purchaseFreightDue,
  totalFreightOutstanding,
} from "@/lib/purchaseFreightSettlement";
import { applyFreightPurchaseUpdate } from "@/lib/purchaseFreightPayment";
import { logActivity } from "@/lib/activityLog";
import { resolveUserCashAccountId, assertUserCanUseCashAccount } from "@/lib/userCashAccount";

function canManage(user) {
  return user && (user.role === "admin" || user.role === "manager" || user.role === "accountant");
}

export async function POST(req) {
  try {
    const user = getUserFromRequest(req);
    if (!canManage(user)) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const vendorAccountId = parseInt(body.vendorAccountId, 10);
    const cashAmount = parseNum(body.cashAmount);
    const bankAmount = parseNum(body.bankAmount);
    const totalPay = cashAmount + bankAmount;

    if (!vendorAccountId) {
      return Response.json({ error: "Select a farmer or company account" }, { status: 400 });
    }
    if (totalPay <= 0) {
      return Response.json({ error: "Enter a cash or bank payment amount" }, { status: 400 });
    }

    const vendorAccount = await prisma.account.findUnique({
      where: { id: vendorAccountId },
      select: { id: true, name: true, category: true },
    });
    if (!vendorAccount) {
      return Response.json({ error: "Account not found" }, { status: 404 });
    }
    if (vendorAccount.category !== "farmer" && vendorAccount.category !== "company") {
      return Response.json(
        { error: "Freight payments apply to farmer or company accounts only" },
        { status: 400 }
      );
    }

    const openPurchases = await findOutstandingPurchasesForLedgerAccount(prisma, vendorAccountId);
    const freightBills = openPurchases.filter(
      (p) => (p.transportCost || 0) > 0 && purchaseFreightDue(p) > 0
    );

    if (freightBills.length === 0) {
      return Response.json({ error: "No purchase bills with outstanding freight for this account" }, { status: 400 });
    }

    const totalDue = totalFreightOutstanding(freightBills);
    if (totalPay > totalDue + 0.01) {
      return Response.json(
        { error: `Payment exceeds total freight due (${totalDue.toFixed(2)})` },
        { status: 400 }
      );
    }

    const { allocations, unapplied } = planFifoFreightSettlement(freightBills, cashAmount, bankAmount);
    if (allocations.length === 0) {
      return Response.json({ error: "Nothing to settle with this payment" }, { status: 400 });
    }
    if (unapplied > 0.01) {
      return Response.json(
        { error: "Payment could not be fully allocated to freight — check amounts" },
        { status: 400 }
      );
    }

    const paymentDate = body.paymentDate ? new Date(body.paymentDate) : new Date();
    let cashAccountId = body.cashAccountId ? parseInt(body.cashAccountId, 10) : null;
    const bankAccountId = body.bankAccountId ? parseInt(body.bankAccountId, 10) : null;
    const notes = body.notes?.trim() || "";

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
        const existing = await tx.purchaseOrder.findUnique({ where: { id: alloc.purchaseId } });
        if (!existing) continue;

        const freightDue = purchaseFreightDue(existing);
        const payTotal = alloc.cashAmount + alloc.bankAmount;
        if (payTotal > freightDue + 0.01) {
          throw new Error(`Freight due changed on ${existing.purchaseNumber} — refresh and try again`);
        }

        const updated = await applyFreightPurchaseUpdate(
          tx,
          existing,
          alloc,
          paymentDate,
          notes,
          cashAccountId,
          bankAccountId
        );
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
        action: "freight_payment",
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
    console.error("Freight payment error:", error);
    if (error.message?.includes("account") || error.message?.includes("Freight")) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

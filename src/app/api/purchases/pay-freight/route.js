import prisma, { runTransaction } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { parseNum } from "@/lib/order-processing";
import {
  findPurchasesWithFreightDueForLedgerAccount,
  planFifoFreightSettlement,
  purchaseFreightDue,
} from "@/lib/purchaseFreightSettlement";
import {
  applyFreightPurchaseUpdate,
  applyStandaloneFreightDeduction,
} from "@/lib/purchaseFreightPayment";
import { logActivity } from "@/lib/activityLog";

/** Stock and ledger flows run long interactive transactions; allow up to 60s on serverless hosts. */
export const maxDuration = 60;

function canManage(user) {
  return user && (user.role === "admin" || user.role === "manager" || user.role === "accountant");
}

export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!canManage(user)) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const vendorAccountId = parseInt(body.vendorAccountId, 10);
    const amount = parseNum(body.amount);

    if (!vendorAccountId) {
      return Response.json({ error: "Select a vendor account" }, { status: 400 });
    }
    if (amount <= 0) {
      return Response.json({ error: "Enter an amount to deduct from the account" }, { status: 400 });
    }

    const vendorAccount = await prisma.account.findUnique({
      where: { id: vendorAccountId },
      select: { id: true, name: true, category: true, balance: true },
    });
    if (!vendorAccount) {
      return Response.json({ error: "Account not found" }, { status: 404 });
    }
    if (vendorAccount.category !== "farmer" && vendorAccount.category !== "company") {
      return Response.json(
        { error: "Freight settlement applies to vendor accounts only" },
        { status: 400 }
      );
    }

    const freightBills = await findPurchasesWithFreightDueForLedgerAccount(prisma, vendorAccountId);
    const { allocations, unapplied } = planFifoFreightSettlement(freightBills, amount);
    const standaloneAmount = unapplied > 0.01 ? unapplied : freightBills.length === 0 ? amount : 0;

    const paymentDate = body.paymentDate ? new Date(body.paymentDate) : new Date();
    const notes = body.notes?.trim() || "";

    const result = await runTransaction(async (tx) => {
      const updatedPurchases = [];

      for (const alloc of allocations) {
        const existing = await tx.purchaseOrder.findUnique({ where: { id: alloc.purchaseId } });
        if (!existing) continue;

        const freightDue = purchaseFreightDue(existing);
        if (alloc.amount > freightDue + 0.01) {
          throw new Error(`Freight due changed on ${existing.purchaseNumber} — refresh and try again`);
        }

        const updated = await applyFreightPurchaseUpdate(
          tx,
          existing,
          alloc,
          paymentDate,
          notes,
          vendorAccountId
        );
        updatedPurchases.push(updated);
      }

      if (standaloneAmount > 0.01) {
        await applyStandaloneFreightDeduction(tx, vendorAccountId, {
          amount: standaloneAmount,
          paymentDate,
          notes,
        });
      }

      return { updatedPurchases, standaloneAmount };
    });

    logActivity({
      userId: user.userId,
      action: "UPDATE",
      module: "purchases",
      entityType: "PurchaseOrder",
      entityId: vendorAccountId,
      details: {
        action: "freight_deduction",
        vendorAccountId,
        amount,
        billsCleared: allocations.length,
        standaloneAmount: result.standaloneAmount,
        purchaseIds: allocations.map((a) => a.purchaseId),
      },
      req,
    });

    return Response.json({
      success: true,
      allocations,
      standaloneAmount: result.standaloneAmount,
      purchases: result.updatedPurchases,
      vendorAccount,
    });
  } catch (error) {
    console.error("Freight deduction error:", error);
    if (error.message?.includes("account") || error.message?.includes("Freight")) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

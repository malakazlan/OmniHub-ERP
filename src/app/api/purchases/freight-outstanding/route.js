import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import {
  findPurchasesWithFreightDueForLedgerAccount,
  purchaseFreightDue,
  totalFreightOutstanding,
} from "@/lib/purchaseFreightSettlement";

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const ledgerAccountId = parseInt(searchParams.get("ledgerAccountId") || "", 10);
    if (!ledgerAccountId) {
      return Response.json({ error: "ledgerAccountId is required" }, { status: 400 });
    }

    const account = await prisma.account.findUnique({
      where: { id: ledgerAccountId },
      select: { id: true, name: true, code: true, category: true, balance: true },
    });
    if (!account) {
      return Response.json({ error: "Account not found" }, { status: 404 });
    }
    if (account.category !== "farmer" && account.category !== "company") {
      return Response.json(
        { error: "Freight deductions apply to farmer or company accounts only" },
        { status: 400 }
      );
    }

    const purchases = (await findPurchasesWithFreightDueForLedgerAccount(prisma, ledgerAccountId)).map(
      (p) => ({
        ...p,
        freightDue: purchaseFreightDue(p),
        billBalance: Math.max((p.totalAmount || 0) - (p.paidAmount || 0), 0),
      })
    );

    return Response.json({
      success: true,
      account,
      purchases,
      summary: {
        billCount: purchases.length,
        totalFreightDue: totalFreightOutstanding(purchases),
      },
    });
  } catch (error) {
    console.error("Freight outstanding error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

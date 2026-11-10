import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { listPurchaseVendorAccounts } from "@/lib/purchaseVendorSummary";

export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { vendors, summary } = await listPurchaseVendorAccounts(prisma);

    return Response.json({ success: true, vendors, summary });
  } catch (error) {
    console.error("List purchase vendors error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

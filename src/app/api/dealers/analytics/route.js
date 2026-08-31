import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { buildDealersAnalytics } from "@/lib/dealerSummary";

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const dealerId = searchParams.get("dealerId");
    const city = searchParams.get("city");
    const status = searchParams.get("status");
    const sortBy = searchParams.get("sortBy") || "pending";

    const analytics = await buildDealersAnalytics(prisma, {
      from,
      to,
      dealerId,
      city,
      status,
      sortBy,
    });

    return Response.json({ success: true, ...analytics });
  } catch (error) {
    console.error("Dealer analytics error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

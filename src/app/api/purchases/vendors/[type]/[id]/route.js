import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { getPurchaseVendorDetail } from "@/lib/purchaseVendorSummary";

export async function GET(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { type, id } = await params;
    const entityId = parseInt(id, 10);

    if (type !== "farmer" && type !== "company") {
      return Response.json({ error: "Invalid vendor type" }, { status: 400 });
    }
    if (!Number.isFinite(entityId)) {
      return Response.json({ error: "Invalid vendor id" }, { status: 400 });
    }

    const detail = await getPurchaseVendorDetail(prisma, type, entityId);
    if (!detail) return Response.json({ error: "Vendor not found" }, { status: 404 });

    return Response.json({ success: true, ...detail });
  } catch (error) {
    console.error("Purchase vendor detail error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

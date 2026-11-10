import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { canViewOrders } from "@/lib/customerOrderAccess";
import { mustScopeOrdersToSelf } from "@/lib/ordersNav";

const DEFAULT_SETTINGS = {
  company_name: "Omni Hub",
  company_address: "",
  company_phone: "",
  company_email: "",
  ntn: "",
  strn: "",
  currency: "USD",
};

async function loadCompanySettings() {
  const settings = await prisma.setting.findMany({
    orderBy: [{ group: "asc" }, { key: "asc" }],
  });
  const settingsMap = { ...DEFAULT_SETTINGS };
  for (const s of settings) {
    settingsMap[s.key] = s.value;
  }
  return settingsMap;
}

const saleInclude = {
  items: { include: { product: { select: { id: true, name: true, sku: true, unit: true } } } },
  company: { select: { id: true, name: true, phone: true, address: true } },
  shop: { select: { id: true, name: true, phone: true, address: true } },
};

export async function GET(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canViewOrders(user)) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const orderId = parseInt(id, 10);

    const order = await prisma.customerOrder.findUnique({
      where: { id: orderId },
      select: { id: true, saleOrderId: true, status: true, createdById: true },
    });

    if (!order) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }

    if (mustScopeOrdersToSelf(user) && order.createdById !== user.userId) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!order.saleOrderId) {
      return Response.json({ error: "No invoice linked to this order yet" }, { status: 404 });
    }

    const [sale, company] = await Promise.all([
      prisma.saleOrder.findUnique({
        where: { id: order.saleOrderId },
        include: saleInclude,
      }),
      loadCompanySettings(),
    ]);

    if (!sale) {
      return Response.json({ error: "Invoice not found" }, { status: 404 });
    }

    return Response.json({
      success: true,
      sale,
      company,
      orderStatus: order.status,
    });
  } catch (error) {
    console.error("Order invoice error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

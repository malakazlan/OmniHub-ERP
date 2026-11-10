import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { generateDocumentNumber } from "@/lib/receipt";
import { logActivity } from "@/lib/activityLog";
import {
  buildCustomerOrderPayload,
  customerOrderInclude,
} from "@/lib/customerOrderPayload";
import {
  canCreateOrder,
  canViewOrders,
} from "@/lib/customerOrderAccess";
import { mustScopeOrdersToSelf } from "@/lib/ordersNav";
import { sanitizeCustomerOrders } from "@/lib/customerOrderSerialize";

export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || !canViewOrders(user)) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view") || "current";
    const status = searchParams.get("status");
    const forSale = searchParams.get("forSale") === "1";

    let where = {};
    if (forSale) {
      where = { status: "accepted", saleOrderId: null };
    } else if (status) {
      where = { status };
    } else if (view === "history") {
      where = { status: { in: ["rejected", "converted"] } };
    } else if (view === "all") {
      where = {};
    } else {
      where = { status: { in: ["pending", "accepted"] } };
    }

    if (forSale && mustScopeOrdersToSelf(user)) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (mustScopeOrdersToSelf(user)) {
      where = { ...where, createdById: user.userId };
    }

    const orders = await prisma.customerOrder.findMany({
      where,
      include: customerOrderInclude,
      orderBy: [{ orderDate: "desc" }, { id: "desc" }],
    });

    const safe = sanitizeCustomerOrders(orders, user);

    return Response.json({ success: true, orders: safe });
  } catch (error) {
    console.error("List customer orders error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || !canCreateOrder(user)) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.customerName) {
      return Response.json({ error: "Customer name is required" }, { status: 400 });
    }
    if (!body.items?.length) {
      return Response.json({ error: "At least one item is required" }, { status: 400 });
    }

    const { items, data } = await buildCustomerOrderPayload(body, {
      lockRatesToCatalog: mustScopeOrdersToSelf(user),
    });
    const orderDate = data.orderDate;
    const orderNumber = await generateDocumentNumber("customerOrder", orderDate);
    const status = user.role === "admin" || user.role === "manager" ? body.status || "pending" : "pending";

    const order = await prisma.customerOrder.create({
      data: {
        ...data,
        orderNumber,
        status,
        createdById: user.userId,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unit: item.unit,
            rate: item.rate,
            amount: item.amount,
          })),
        },
      },
      include: customerOrderInclude,
    });

    logActivity({
      userId: user.userId,
      action: "CREATE",
      module: "orders",
      entityType: "CustomerOrder",
      entityId: order.id,
      details: { orderNumber: order.orderNumber, totalAmount: order.totalAmount },
      req,
    });

    return Response.json({ success: true, order }, { status: 201 });
  } catch (error) {
    console.error("Create customer order error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

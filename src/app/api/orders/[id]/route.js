import prisma, { runTransaction } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";
import {
  buildCustomerOrderPayload,
  customerOrderInclude,
} from "@/lib/customerOrderPayload";
import {
  canViewOrders,
  canEditOrder,
  canDeleteOrder,
  canReviewOrder,
  canConvertOrder,
} from "@/lib/customerOrderAccess";
import { mustScopeOrdersToSelf } from "@/lib/ordersNav";
import { sanitizeCustomerOrder } from "@/lib/customerOrderSerialize";

/** Stock and ledger flows run long interactive transactions; allow up to 60s on serverless hosts. */
export const maxDuration = 60;

async function loadOrder(id) {
  return prisma.customerOrder.findUnique({
    where: { id: parseInt(id, 10) },
    include: customerOrderInclude,
  });
}

export async function GET(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    const { id } = await params;
    const order = await loadOrder(id);
    if (!order) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }
    if (!canViewOrders(user)) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (mustScopeOrdersToSelf(user) && order.createdById !== user.userId) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }
    return Response.json({ success: true, order: sanitizeCustomerOrder(order, user) });
  } catch (error) {
    console.error("Get customer order error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    const { id } = await params;
    const existing = await loadOrder(id);
    if (!existing) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }
    if (!canEditOrder(user, existing)) {
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

    const order = await runTransaction(async (tx) => {
      await tx.customerOrderItem.deleteMany({ where: { customerOrderId: existing.id } });
      return tx.customerOrder.update({
        where: { id: existing.id },
        data: {
          ...data,
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
    });

    logActivity({
      userId: user.userId,
      action: "UPDATE",
      module: "orders",
      entityType: "CustomerOrder",
      entityId: order.id,
      req,
    });

    return Response.json({ success: true, order });
  } catch (error) {
    console.error("Update customer order error:", error);
    if (error.code === "P2028") {
      return Response.json(
        { error: "Database busy — retry in a moment." },
        { status: 503 }
      );
    }
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    const { id } = await params;
    const existing = await loadOrder(id);
    if (!existing) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }
    if (!canDeleteOrder(user, existing)) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.customerOrder.delete({ where: { id: existing.id } });

    logActivity({
      userId: user.userId,
      action: "DELETE",
      module: "orders",
      entityType: "CustomerOrder",
      entityId: existing.id,
      details: { orderNumber: existing.orderNumber },
      req,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Delete customer order error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    const { id } = await params;
    const body = await req.json();
    const action = body.action;

    const existing = await loadOrder(id);
    if (!existing) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }

    if (action === "accept") {
      if (!canReviewOrder(user)) {
        return Response.json({ error: "Unauthorized" }, { status: 403 });
      }
      if (existing.status !== "pending") {
        return Response.json({ error: "Only pending orders can be accepted" }, { status: 400 });
      }
      const order = await prisma.customerOrder.update({
        where: { id: existing.id },
        data: {
          status: "accepted",
          reviewedById: user.userId,
          reviewedAt: new Date(),
          rejectionReason: null,
        },
        include: customerOrderInclude,
      });
      logActivity({ userId: user.userId, action: "UPDATE", module: "orders", entityType: "CustomerOrder", entityId: order.id, details: { action: "accept" }, req });
      return Response.json({ success: true, order });
    }

    if (action === "reject") {
      if (!canReviewOrder(user)) {
        return Response.json({ error: "Unauthorized" }, { status: 403 });
      }
      if (existing.status !== "pending" && existing.status !== "accepted") {
        return Response.json({ error: "Order cannot be rejected" }, { status: 400 });
      }
      const order = await prisma.customerOrder.update({
        where: { id: existing.id },
        data: {
          status: "rejected",
          reviewedById: user.userId,
          reviewedAt: new Date(),
          rejectionReason: body.reason || null,
        },
        include: customerOrderInclude,
      });
      logActivity({ userId: user.userId, action: "UPDATE", module: "orders", entityType: "CustomerOrder", entityId: order.id, details: { action: "reject" }, req });
      return Response.json({ success: true, order });
    }

    if (action === "convert") {
      if (!canConvertOrder(user, existing)) {
        return Response.json({ error: "Unauthorized or order not ready" }, { status: 403 });
      }
      return Response.json({
        success: true,
        redirectUrl: `/sales/new?orderId=${existing.id}`,
        order: existing,
      });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Order action error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

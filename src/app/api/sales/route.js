import prisma, { runTransaction } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { generateDocumentNumber } from "@/lib/receipt";
import { logActivity } from "@/lib/activityLog";
import {
  parseNum,
  computeItemSubtotal,
  normalizeItems,
  computePaymentStatus,
  shouldApplySaleEffects,
  resolveCustomerAccountId,
  applySaleStockAndLedger,
} from "@/lib/order-processing";
import { resolveUserCashAccountId, assertUserCanUseCashAccount } from "@/lib/userCashAccount";

const saleInclude = {
  items: { include: { product: { select: { id: true, name: true, sku: true } } } },
  company: { select: { id: true, name: true, phone: true } },
  shop: { select: { id: true, name: true, phone: true } },
  gatePass: true,
};

function canManageSales(user) {
  return user && (user.role === "admin" || user.role === "manager" || user.role === "salesperson");
}

function buildSaleData(body, userId) {
  const items = normalizeItems(body.items || []);
  const subtotal = computeItemSubtotal(items);
  const transportCost = parseNum(body.transportCost);
  const loadingCost = parseNum(body.loadingCost);
  const taxAmount = parseNum(body.taxAmount);
  const discountAmount = parseNum(body.discountAmount);
  const totalAmount = subtotal + transportCost + loadingCost + taxAmount - discountAmount;
  const cashAmount = parseNum(body.cashAmount);
  const bankAmount = parseNum(body.bankAmount);
  const paidAmount = cashAmount + bankAmount;
  const status = body.status || "draft";

  return {
    items,
    subtotal,
    totalAmount,
    cashAmount,
    bankAmount,
    paidAmount,
    paymentStatus: computePaymentStatus(paidAmount, totalAmount),
    status,
    data: {
      saleDate: body.saleDate ? new Date(body.saleDate) : new Date(),
      companyId: body.companyId ? parseInt(body.companyId, 10) : null,
      shopId: body.shopId ? parseInt(body.shopId, 10) : null,
      customerName: body.customerName,
      subtotal,
      transportCost,
      loadingCost,
      taxAmount,
      discountAmount,
      totalAmount,
      paidAmount,
      cashAmount,
      bankAmount,
      cashAccountId: body.cashAccountId ? parseInt(body.cashAccountId, 10) : null,
      bankAccountId: body.bankAccountId ? parseInt(body.bankAccountId, 10) : null,
      vehicleNumber: body.vehicleNumber || null,
      driverName: body.driverName || null,
      status,
      notes: body.notes || null,
      createdById: userId,
    },
  };
}

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const companyId = searchParams.get("companyId");
    const shopId = searchParams.get("shopId");

    const where = {};
    if (status) where.status = status;
    if (companyId) where.companyId = parseInt(companyId, 10);
    if (shopId) where.shopId = parseInt(shopId, 10);

    const sales = await prisma.saleOrder.findMany({
      where,
      include: saleInclude,
      orderBy: { saleDate: "desc" },
    });

    return Response.json({ success: true, sales });
  } catch (error) {
    console.error("List sales error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = getUserFromRequest(req);
    if (!canManageSales(user)) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();

    if (parseNum(body.cashAmount) > 0 && !body.cashAccountId) {
      const userCash = await resolveUserCashAccountId(prisma, user.userId);
      if (userCash) body.cashAccountId = userCash;
    }

    if (parseNum(body.cashAmount) > 0 && body.cashAccountId) {
      try {
        await assertUserCanUseCashAccount(prisma, user, body.cashAccountId);
      } catch (err) {
        return Response.json({ error: err.message }, { status: 403 });
      }
    }

    if (!body.customerName) {
      return Response.json({ error: "Customer name is required" }, { status: 400 });
    }
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return Response.json({ error: "At least one item is required" }, { status: 400 });
    }

    const { items, data, status } = buildSaleData(body, user.userId);
    const saleDate = data.saleDate;
    const invoiceNumber = await generateDocumentNumber("sale", saleDate);

    const sale = await runTransaction(async (tx) => {
      const customerAccountId = await resolveCustomerAccountId(tx, {
        companyId: data.companyId,
        shopId: data.shopId,
      });

      const order = await tx.saleOrder.create({
        data: {
          ...data,
          invoiceNumber,
          customerAccountId,
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
        include: { items: true },
      });

      if (shouldApplySaleEffects(status)) {
        await applySaleStockAndLedger(tx, order, order.items);
      }

      const customerOrderId = body.customerOrderId ? parseInt(body.customerOrderId, 10) : null;
      if (customerOrderId && status === "confirmed") {
        const co = await tx.customerOrder.findUnique({ where: { id: customerOrderId } });
        if (co && co.status === "accepted" && !co.saleOrderId) {
          await tx.customerOrder.update({
            where: { id: customerOrderId },
            data: {
              status: "converted",
              saleOrderId: order.id,
              reviewedById: user.userId,
              reviewedAt: new Date(),
            },
          });
        }
      }

      return tx.saleOrder.findUnique({
        where: { id: order.id },
        include: saleInclude,
      });
    });

    logActivity({ userId: user.userId, action: "CREATE", module: "sales", entityType: "SaleOrder", entityId: sale.id, details: { invoiceNumber: sale.invoiceNumber, totalAmount: sale.totalAmount }, req });

    return Response.json({ success: true, sale }, { status: 201 });
  } catch (error) {
    console.error("Create sale error:", error);
    if (error.message?.includes("not found") || error.message?.includes("Insufficient")) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

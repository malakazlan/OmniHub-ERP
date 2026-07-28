import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import {
  parseNum,
  computeItemSubtotal,
  normalizeItems,
  computePaymentStatus,
  shouldApplySaleEffects,
  resolveCustomerAccountId,
  applySaleStockAndLedger,
} from "@/lib/order-processing";

const saleInclude = {
  items: { include: { product: { select: { id: true, name: true, sku: true, currentStock: true } } } },
  company: { select: { id: true, name: true, phone: true, accountId: true } },
  shop: { select: { id: true, name: true, phone: true, accountId: true } },
  gatePass: true,
};

function canManageSales(user) {
  return user && (user.role === "admin" || user.role === "manager" || user.role === "salesperson");
}

function buildSaleUpdate(body) {
  const items = body.items ? normalizeItems(body.items) : null;
  const subtotal = items ? computeItemSubtotal(items) : undefined;
  const transportCost = body.transportCost !== undefined ? parseNum(body.transportCost) : undefined;
  const loadingCost = body.loadingCost !== undefined ? parseNum(body.loadingCost) : undefined;
  const taxAmount = body.taxAmount !== undefined ? parseNum(body.taxAmount) : undefined;
  const discountAmount = body.discountAmount !== undefined ? parseNum(body.discountAmount) : undefined;
  const cashAmount = body.cashAmount !== undefined ? parseNum(body.cashAmount) : undefined;
  const bankAmount = body.bankAmount !== undefined ? parseNum(body.bankAmount) : undefined;

  let totalAmount;
  let paidAmount;
  let paymentStatus;

  if (subtotal !== undefined) {
    const t = transportCost ?? 0;
    const l = loadingCost ?? 0;
    const tax = taxAmount ?? 0;
    const disc = discountAmount ?? 0;
    totalAmount = subtotal + t + l + tax - disc;
  }

  if (cashAmount !== undefined || bankAmount !== undefined) {
    const cash = cashAmount ?? 0;
    const bank = bankAmount ?? 0;
    paidAmount = cash + bank;
  }

  if (totalAmount !== undefined && paidAmount !== undefined) {
    paymentStatus = computePaymentStatus(paidAmount, totalAmount);
  }

  return { items, subtotal, totalAmount, paidAmount, paymentStatus, transportCost, loadingCost, taxAmount, discountAmount, cashAmount, bankAmount };
}

export async function GET(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const saleId = parseInt(id, 10);

    const sale = await prisma.saleOrder.findUnique({
      where: { id: saleId },
      include: saleInclude,
    });

    if (!sale) {
      return Response.json({ error: "Sale not found" }, { status: 404 });
    }

    return Response.json({ success: true, sale });
  } catch (error) {
    console.error("Fetch sale error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!canManageSales(user)) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const saleId = parseInt(id, 10);
    const body = await req.json();

    const existing = await prisma.saleOrder.findUnique({
      where: { id: saleId },
      include: { items: true },
    });

    if (!existing) {
      return Response.json({ error: "Sale not found" }, { status: 404 });
    }

    const newStatus = body.status ?? existing.status;
    const wasDraft = existing.status === "draft";
    const applyingEffects = wasDraft && shouldApplySaleEffects(newStatus) && !shouldApplySaleEffects(existing.status);

    if (existing.status !== "draft" && body.items) {
      return Response.json({ error: "Only draft sales can have items modified" }, { status: 400 });
    }

    const computed = existing.status === "draft" ? buildSaleUpdate(body) : {};

    const sale = await prisma.$transaction(async (tx) => {
      let updateData = {};

      if (existing.status === "draft") {
        if (body.saleDate) updateData.saleDate = new Date(body.saleDate);
        if (body.companyId !== undefined) updateData.companyId = body.companyId ? parseInt(body.companyId, 10) : null;
        if (body.shopId !== undefined) updateData.shopId = body.shopId ? parseInt(body.shopId, 10) : null;
        if (body.customerName !== undefined) updateData.customerName = body.customerName;
        if (body.notes !== undefined) updateData.notes = body.notes || null;
        if (body.vehicleNumber !== undefined) updateData.vehicleNumber = body.vehicleNumber || null;
        if (body.driverName !== undefined) updateData.driverName = body.driverName || null;
        if (body.cashAccountId !== undefined) updateData.cashAccountId = body.cashAccountId ? parseInt(body.cashAccountId, 10) : null;
        if (body.bankAccountId !== undefined) updateData.bankAccountId = body.bankAccountId ? parseInt(body.bankAccountId, 10) : null;
        if (computed.transportCost !== undefined) updateData.transportCost = computed.transportCost;
        if (computed.loadingCost !== undefined) updateData.loadingCost = computed.loadingCost;
        if (computed.taxAmount !== undefined) updateData.taxAmount = computed.taxAmount;
        if (computed.discountAmount !== undefined) updateData.discountAmount = computed.discountAmount;
        if (computed.subtotal !== undefined) updateData.subtotal = computed.subtotal;
        if (computed.totalAmount !== undefined) updateData.totalAmount = computed.totalAmount;
        if (computed.cashAmount !== undefined) updateData.cashAmount = computed.cashAmount;
        if (computed.bankAmount !== undefined) updateData.bankAmount = computed.bankAmount;
        if (computed.paidAmount !== undefined) updateData.paidAmount = computed.paidAmount;
        if (computed.paymentStatus !== undefined) updateData.paymentStatus = computed.paymentStatus;

        const companyId = updateData.companyId !== undefined ? updateData.companyId : existing.companyId;
        const shopId = updateData.shopId !== undefined ? updateData.shopId : existing.shopId;
        updateData.customerAccountId = await resolveCustomerAccountId(tx, { companyId, shopId });

        if (computed.items) {
          await tx.saleItem.deleteMany({ where: { saleOrderId: saleId } });
          updateData.items = {
            create: computed.items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unit: item.unit,
              rate: item.rate,
              amount: item.amount,
            })),
          };
        }
      }

      if (body.status !== undefined) {
        updateData.status = newStatus;
      }

      const order = await tx.saleOrder.update({
        where: { id: saleId },
        data: updateData,
        include: { items: true },
      });

      if (applyingEffects) {
        await applySaleStockAndLedger(tx, order, order.items);
      }

      return tx.saleOrder.findUnique({
        where: { id: saleId },
        include: saleInclude,
      });
    });

    return Response.json({ success: true, sale });
  } catch (error) {
    console.error("Update sale error:", error);
    if (error.message?.includes("not found") || error.message?.includes("Insufficient")) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!canManageSales(user)) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const saleId = parseInt(id, 10);

    const sale = await prisma.saleOrder.findUnique({
      where: { id: saleId },
    });

    if (!sale) {
      return Response.json({ error: "Sale not found" }, { status: 404 });
    }

    if (sale.status !== "draft") {
      return Response.json({ error: "Only draft sales can be deleted" }, { status: 400 });
    }

    await prisma.saleOrder.delete({ where: { id: saleId } });

    return Response.json({ success: true, message: "Sale deleted successfully" });
  } catch (error) {
    console.error("Delete sale error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

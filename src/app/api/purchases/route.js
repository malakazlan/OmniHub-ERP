import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { generateDocumentNumber } from "@/lib/receipt";
import { logActivity } from "@/lib/activityLog";
import {
  parseNum,
  computeItemSubtotal,
  normalizeItems,
  computePaymentStatus,
  shouldApplyPurchaseEffects,
  resolveVendorAccountId,
  applyPurchaseStockAndLedger,
  syncPurchasePaymentLedgerLegs,
} from "@/lib/order-processing";

const purchaseInclude = {
  items: { include: { product: { select: { id: true, name: true, sku: true } } } },
  farmer: { select: { id: true, name: true, phone: true } },
  company: { select: { id: true, name: true, phone: true } },
};

function canManagePurchases(user) {
  return user && (user.role === "admin" || user.role === "manager");
}

function buildPurchaseData(body, userId) {
  const items = normalizeItems(body.items || []);
  const subtotal = computeItemSubtotal(items);
  const transportCost = parseNum(body.transportCost);
  const loadingCost = parseNum(body.loadingCost);
  const labourCost = parseNum(body.labourCost);
  const taxAmount = parseNum(body.taxAmount);
  const discountAmount = parseNum(body.discountAmount);
  const totalAmount = subtotal + transportCost + loadingCost + labourCost + taxAmount - discountAmount;
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
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : new Date(),
      farmerId: body.farmerId ? parseInt(body.farmerId, 10) : null,
      companyId: body.companyId ? parseInt(body.companyId, 10) : null,
      vendorName: body.vendorName,
      subtotal,
      transportCost,
      loadingCost,
      labourCost,
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
    const farmerId = searchParams.get("farmerId");
    const companyId = searchParams.get("companyId");

    const where = {};
    if (status) where.status = status;
    if (farmerId) where.farmerId = parseInt(farmerId, 10);
    if (companyId) where.companyId = parseInt(companyId, 10);

    const purchases = await prisma.purchaseOrder.findMany({
      where,
      include: purchaseInclude,
      orderBy: { purchaseDate: "desc" },
    });

    return Response.json({ success: true, purchases });
  } catch (error) {
    console.error("List purchases error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = getUserFromRequest(req);
    if (!canManagePurchases(user)) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();

    let vendorName = body.vendorName?.trim() || "";
    if (!vendorName && body.farmerId) {
      const farmer = await prisma.farmer.findUnique({
        where: { id: parseInt(body.farmerId, 10) },
        select: { name: true },
      });
      vendorName = farmer?.name || "";
    }
    if (!vendorName && body.companyId) {
      const company = await prisma.company.findUnique({
        where: { id: parseInt(body.companyId, 10) },
        select: { name: true },
      });
      vendorName = company?.name || "";
    }

    if (!vendorName) {
      return Response.json(
        { error: "Vendor name is required — select a farmer or company" },
        { status: 400 }
      );
    }
    if (!body.farmerId && !body.companyId) {
      return Response.json({ error: "Select a farmer or company supplier" }, { status: 400 });
    }
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return Response.json({ error: "At least one item is required" }, { status: 400 });
    }

    const { items, data, status } = buildPurchaseData({ ...body, vendorName }, user.userId);
    const purchaseDate = data.purchaseDate;
    const purchaseNumber = await generateDocumentNumber("purchase", purchaseDate);

    const purchase = await prisma.$transaction(async (tx) => {
      const vendorAccountId = await resolveVendorAccountId(tx, {
        farmerId: data.farmerId,
        companyId: data.companyId,
      });

      const order = await tx.purchaseOrder.create({
        data: {
          ...data,
          purchaseNumber,
          vendorAccountId,
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

      if (shouldApplyPurchaseEffects(status)) {
        const ledgerAccounts = await applyPurchaseStockAndLedger(tx, order, order.items);
        if (ledgerAccounts?.cashAccountId || ledgerAccounts?.bankAccountId) {
          await tx.purchaseOrder.update({
            where: { id: order.id },
            data: {
              cashAccountId: ledgerAccounts.cashAccountId ?? order.cashAccountId,
              bankAccountId: ledgerAccounts.bankAccountId ?? order.bankAccountId,
            },
          });
        }
      }

      return tx.purchaseOrder.findUnique({
        where: { id: order.id },
        include: purchaseInclude,
      });
    });

    logActivity({ userId: user.userId, action: "CREATE", module: "purchases", entityType: "PurchaseOrder", entityId: purchase.id, details: { purchaseNumber: purchase.purchaseNumber, totalAmount: purchase.totalAmount }, req });

    return Response.json({ success: true, purchase }, { status: 201 });
  } catch (error) {
    console.error("Create purchase error:", error);
    if (error.message?.includes("not found") || error.message?.includes("Insufficient")) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    if (error.code === "P2002") {
      return Response.json({ error: "Duplicate purchase number" }, { status: 400 });
    }
    if (error.code === "P2003") {
      return Response.json({ error: "Invalid reference (product, farmer, or company)" }, { status: 400 });
    }
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import prisma, { runTransaction, withDbRetry, isTransientDbError, dbUnavailableResponse } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
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
import { computeVendorBalancesForPurchase } from "@/lib/purchaseBalances";

const purchaseInclude = {
  items: { include: { product: { select: { id: true, name: true, sku: true, currentStock: true } } } },
  farmer: { select: { id: true, name: true, phone: true, accountId: true } },
  company: { select: { id: true, name: true, phone: true, accountId: true } },
};

function canManagePurchases(user) {
  return user && (user.role === "admin" || user.role === "manager");
}

function buildPurchaseUpdate(body) {
  const items = body.items ? normalizeItems(body.items) : null;
  const subtotal = items ? computeItemSubtotal(items) : undefined;
  const transportCost = body.transportCost !== undefined ? parseNum(body.transportCost) : undefined;
  const loadingCost = body.loadingCost !== undefined ? parseNum(body.loadingCost) : undefined;
  const labourCost = body.labourCost !== undefined ? parseNum(body.labourCost) : undefined;
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
    const lb = labourCost ?? 0;
    const tax = taxAmount ?? 0;
    const disc = discountAmount ?? 0;
    totalAmount = subtotal + t + l + lb + tax - disc;
  }

  if (cashAmount !== undefined || bankAmount !== undefined) {
    const cash = cashAmount ?? 0;
    const bank = bankAmount ?? 0;
    paidAmount = cash + bank;
  }

  if (totalAmount !== undefined && paidAmount !== undefined) {
    paymentStatus = computePaymentStatus(paidAmount, totalAmount);
  }

  return { items, subtotal, totalAmount, paidAmount, paymentStatus, transportCost, loadingCost, labourCost, taxAmount, discountAmount, cashAmount, bankAmount };
}

export async function GET(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const purchaseId = parseInt(id, 10);

    const purchase = await withDbRetry((db) =>
      db.purchaseOrder.findUnique({
        where: { id: purchaseId },
        include: purchaseInclude,
      })
    );

    if (!purchase) {
      return Response.json({ error: "Purchase not found" }, { status: 404 });
    }

    let vendorAccountBalance = 0;
    if (purchase.vendorAccountId) {
      const acc = await withDbRetry((db) =>
        db.account.findUnique({
          where: { id: purchase.vendorAccountId },
          select: { balance: true },
        })
      );
      vendorAccountBalance = acc?.balance ?? 0;
    }

    const { previousBalance, currentBalance } = computeVendorBalancesForPurchase(
      purchase,
      vendorAccountBalance
    );

    return Response.json({
      success: true,
      purchase: {
        ...purchase,
        vendorAccountBalance,
        previousBalance,
        currentBalance,
      },
    });
  } catch (error) {
    console.error("Fetch purchase error:", error);
    if (isTransientDbError(error)) return dbUnavailableResponse(error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!canManagePurchases(user)) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const purchaseId = parseInt(id, 10);
    const body = await req.json();

    const existing = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseId },
      include: { items: true },
    });

    if (!existing) {
      return Response.json({ error: "Purchase not found" }, { status: 404 });
    }

    const newStatus = body.status ?? existing.status;
    const wasDraft = existing.status === "draft";
    const applyingEffects = wasDraft && shouldApplyPurchaseEffects(newStatus) && !shouldApplyPurchaseEffects(existing.status);

    if (existing.status !== "draft" && body.items) {
      return Response.json({ error: "Only draft purchases can have items modified" }, { status: 400 });
    }

    const computed = existing.status === "draft" ? buildPurchaseUpdate(body) : {};

    const purchase = await runTransaction(async (tx) => {
      let updateData = {};

      if (existing.status === "draft") {
        if (body.purchaseDate) updateData.purchaseDate = new Date(body.purchaseDate);
        if (body.farmerId !== undefined) updateData.farmerId = body.farmerId ? parseInt(body.farmerId, 10) : null;
        if (body.companyId !== undefined) updateData.companyId = body.companyId ? parseInt(body.companyId, 10) : null;
        if (body.vendorName !== undefined) updateData.vendorName = body.vendorName;
        if (body.notes !== undefined) updateData.notes = body.notes || null;
        if (body.vehicleNumber !== undefined) updateData.vehicleNumber = body.vehicleNumber || null;
        if (body.driverName !== undefined) updateData.driverName = body.driverName || null;
        if (body.cashAccountId !== undefined) updateData.cashAccountId = body.cashAccountId ? parseInt(body.cashAccountId, 10) : null;
        if (body.bankAccountId !== undefined) updateData.bankAccountId = body.bankAccountId ? parseInt(body.bankAccountId, 10) : null;
        if (computed.transportCost !== undefined) updateData.transportCost = computed.transportCost;
        if (computed.loadingCost !== undefined) updateData.loadingCost = computed.loadingCost;
        if (computed.labourCost !== undefined) updateData.labourCost = computed.labourCost;
        if (computed.taxAmount !== undefined) updateData.taxAmount = computed.taxAmount;
        if (computed.discountAmount !== undefined) updateData.discountAmount = computed.discountAmount;
        if (computed.subtotal !== undefined) updateData.subtotal = computed.subtotal;
        if (computed.totalAmount !== undefined) updateData.totalAmount = computed.totalAmount;
        if (computed.cashAmount !== undefined) updateData.cashAmount = computed.cashAmount;
        if (computed.bankAmount !== undefined) updateData.bankAmount = computed.bankAmount;
        if (computed.paidAmount !== undefined) updateData.paidAmount = computed.paidAmount;
        if (computed.paymentStatus !== undefined) updateData.paymentStatus = computed.paymentStatus;

        const farmerId = updateData.farmerId !== undefined ? updateData.farmerId : existing.farmerId;
        const companyId = updateData.companyId !== undefined ? updateData.companyId : existing.companyId;
        updateData.vendorAccountId = await resolveVendorAccountId(tx, { farmerId, companyId });

        if (computed.items) {
          await tx.purchaseItem.deleteMany({ where: { purchaseOrderId: purchaseId } });
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

      const order = await tx.purchaseOrder.update({
        where: { id: purchaseId },
        data: updateData,
        include: { items: true },
      });

      if (applyingEffects) {
        const ledgerAccounts = await applyPurchaseStockAndLedger(tx, order, order.items);
        if (ledgerAccounts?.cashAccountId || ledgerAccounts?.bankAccountId) {
          await tx.purchaseOrder.update({
            where: { id: purchaseId },
            data: {
              cashAccountId: ledgerAccounts.cashAccountId ?? order.cashAccountId,
              bankAccountId: ledgerAccounts.bankAccountId ?? order.bankAccountId,
            },
          });
        }
      }

      return tx.purchaseOrder.findUnique({
        where: { id: purchaseId },
        include: purchaseInclude,
      });
    });

    return Response.json({ success: true, purchase });
  } catch (error) {
    console.error("Update purchase error:", error);
    if (error.message?.includes("not found") || error.message?.includes("Insufficient")) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!canManagePurchases(user)) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const purchaseId = parseInt(id, 10);

    const purchase = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseId },
    });

    if (!purchase) {
      return Response.json({ error: "Purchase not found" }, { status: 404 });
    }

    if (purchase.status !== "draft") {
      return Response.json({ error: "Only draft purchases can be deleted" }, { status: 400 });
    }

    await prisma.purchaseOrder.delete({ where: { id: purchaseId } });

    return Response.json({ success: true, message: "Purchase deleted successfully" });
  } catch (error) {
    console.error("Delete purchase error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

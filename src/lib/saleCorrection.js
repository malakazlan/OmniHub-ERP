import { parseNum, computePaymentStatus, normalizeItems, computeItemSubtotal, resolveCustomerAccountId, applySaleStockAndLedger, shouldApplySaleEffects } from "@/lib/order-processing";
import { createLedgerEntry, findActiveOrderLedgerEntries } from "@/lib/ledger";
import { reconcileSaleOrderWithReturns } from "@/lib/saleReturn";

const CORRECTABLE_STATUSES = new Set(["confirmed", "dispatched", "delivered"]);

export function canCorrectSale(sale, { returnsCount = 0 } = {}) {
  if (!sale) return { ok: false, reason: "Sale not found" };
  if (!CORRECTABLE_STATUSES.has(sale.status)) {
    return { ok: false, reason: "Only confirmed, dispatched, or delivered bills can be corrected" };
  }
  if (returnsCount > 0) {
    return { ok: false, reason: "Bills with returns cannot be corrected — use returns or void first" };
  }
  return { ok: true };
}

async function reverseSaleStock(tx, sale, items) {
  for (const item of items) {
    const product = await tx.product.findUnique({ where: { id: item.productId } });
    if (!product) throw new Error(`Item ${item.productId} not found`);

    const previousStock = product.currentStock;
    const newStock = previousStock + parseNum(item.quantity);

    await tx.product.update({
      where: { id: item.productId },
      data: { currentStock: newStock },
    });

    await tx.stockMovement.create({
      data: {
        productId: item.productId,
        movementType: "return_in",
        quantity: parseNum(item.quantity),
        previousStock,
        newStock,
        referenceType: "SaleCorrection",
        referenceId: sale.id,
        notes: `Bill correction reversal · ${sale.invoiceNumber}`,
      },
    });
  }
}

async function reverseSaleLedgerEntries(tx, sale, correctionDate) {
  const entries = await findActiveOrderLedgerEntries(tx, {
    orderReferenceType: "SaleOrder",
    correctionReferenceType: "SaleCorrection",
    orderId: sale.id,
  });

  for (const entry of entries) {
    if ((entry.debit || 0) <= 0 && (entry.credit || 0) <= 0) continue;

    await createLedgerEntry(tx, {
      accountId: entry.accountId,
      date: correctionDate,
      description: `Correction reversal · ${entry.description || sale.invoiceNumber}`,
      reference: sale.invoiceNumber,
      referenceType: "SaleCorrection",
      referenceId: sale.id,
      debit: entry.credit || 0,
      credit: entry.debit || 0,
    });
  }
}

function buildCorrectionNote(existingNotes, reason, userName) {
  const stamp = new Date().toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const line = `[Corrected ${stamp}${userName ? ` by ${userName}` : ""}]: ${reason.trim()}`;
  return existingNotes ? `${existingNotes}\n${line}` : line;
}

export function buildSaleCorrectionPayload(body) {
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

  if (subtotal !== undefined) {
    totalAmount =
      subtotal +
      (transportCost ?? 0) +
      (loadingCost ?? 0) +
      (taxAmount ?? 0) -
      (discountAmount ?? 0);
  }

  if (cashAmount !== undefined || bankAmount !== undefined) {
    paidAmount = (cashAmount ?? 0) + (bankAmount ?? 0);
  }

  const paymentStatus =
    totalAmount !== undefined && paidAmount !== undefined
      ? computePaymentStatus(paidAmount, totalAmount)
      : undefined;

  return {
    items,
    subtotal,
    totalAmount,
    paidAmount,
    paymentStatus,
    transportCost,
    loadingCost,
    taxAmount,
    discountAmount,
    cashAmount,
    bankAmount,
  };
}

/**
 * Correct a posted sale bill: reverse stock/ledger, replace line items, re-post.
 */
export async function correctSaleBill(tx, {
  saleId,
  body,
  userName,
}) {
  const reason = String(body.correctionReason || "").trim();
  if (reason.length < 3) {
    throw new Error("Correction reason is required (minimum 3 characters)");
  }

  const existing = await tx.saleOrder.findUnique({
    where: { id: saleId },
    include: { items: true, returns: true },
  });

  if (!existing) throw new Error("Sale not found");

  const gate = canCorrectSale(existing, { returnsCount: existing.returns?.length || 0 });
  if (!gate.ok) throw new Error(gate.reason);

  const computed = buildSaleCorrectionPayload(body);
  if (!computed.items?.length) {
    throw new Error("At least one item is required");
  }

  const correctionDate = body.saleDate ? new Date(body.saleDate) : new Date();

  await reverseSaleStock(tx, existing, existing.items);
  await reverseSaleLedgerEntries(tx, existing, correctionDate);

  const companyId =
    body.companyId !== undefined
      ? body.companyId
        ? parseInt(body.companyId, 10)
        : null
      : existing.companyId;
  const shopId =
    body.shopId !== undefined
      ? body.shopId
        ? parseInt(body.shopId, 10)
        : null
      : existing.shopId;
  const farmerId =
    body.farmerId !== undefined
      ? body.farmerId
        ? parseInt(body.farmerId, 10)
        : null
      : existing.farmerId;

  const customerAccountId = await resolveCustomerAccountId(tx, {
    companyId,
    shopId,
    farmerId,
  });

  await tx.saleItem.deleteMany({ where: { saleOrderId: saleId } });

  const updateData = {
    saleDate: correctionDate,
    companyId,
    shopId,
    farmerId,
    customerName: body.customerName ?? existing.customerName,
    customerAccountId,
    notes: buildCorrectionNote(existing.notes, reason, userName),
    transportCost: computed.transportCost ?? existing.transportCost,
    loadingCost: computed.loadingCost ?? existing.loadingCost,
    taxAmount: computed.taxAmount ?? existing.taxAmount,
    discountAmount: computed.discountAmount ?? existing.discountAmount,
    subtotal: computed.subtotal,
    totalAmount: computed.totalAmount,
    cashAmount: computed.cashAmount ?? existing.cashAmount,
    bankAmount: computed.bankAmount ?? existing.bankAmount,
    paidAmount: computed.paidAmount ?? existing.paidAmount,
    paymentStatus: computed.paymentStatus ?? existing.paymentStatus,
    cashAccountId:
      body.cashAccountId !== undefined
        ? body.cashAccountId
          ? parseInt(body.cashAccountId, 10)
          : null
        : existing.cashAccountId,
    bankAccountId:
      body.bankAccountId !== undefined
        ? body.bankAccountId
          ? parseInt(body.bankAccountId, 10)
          : null
        : existing.bankAccountId,
    vehicleNumber:
      body.vehicleNumber !== undefined ? body.vehicleNumber || null : existing.vehicleNumber,
    driverName: body.driverName !== undefined ? body.driverName || null : existing.driverName,
    items: {
      create: computed.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unit: item.unit,
        rate: item.rate,
        amount: item.amount,
      })),
    },
  };

  const order = await tx.saleOrder.update({
    where: { id: saleId },
    data: updateData,
    include: { items: true },
  });

  if (shouldApplySaleEffects(order.status)) {
    await applySaleStockAndLedger(tx, order, order.items);
  }

  await reconcileSaleOrderWithReturns(tx, saleId);

  return tx.saleOrder.findUnique({
    where: { id: saleId },
    include: {
      items: { include: { product: { select: { id: true, name: true, sku: true } } } },
      company: { select: { id: true, name: true, phone: true, accountId: true } },
      shop: { select: { id: true, name: true, phone: true, accountId: true } },
      farmer: { select: { id: true, name: true, phone: true, accountId: true } },
      returns: true,
    },
  });
}

export function getSaleCorrectionMeta(sale, returnsCount = 0) {
  return canCorrectSale(sale, { returnsCount });
}

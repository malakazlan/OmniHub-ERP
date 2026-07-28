import prisma from "@/lib/prisma";
import { parseNum, normalizeItems, computeItemSubtotal } from "@/lib/order-processing";

/** Force line rates from product catalog (salesperson cannot set custom rates). */
export async function applyCatalogSaleRates(rawItems) {
  const items = normalizeItems(rawItems || []);
  if (!items.length) return items;

  const productIds = [...new Set(items.map((i) => i.productId).filter(Boolean))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, unit: true, salePrice: true },
  });
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));

  return items.map((item) => {
    const product = byId[item.productId];
    const rate = product ? parseNum(product.salePrice) : parseNum(item.rate);
    const quantity = parseNum(item.quantity);
    return {
      ...item,
      productName: product?.name || item.productName,
      unit: product?.unit || item.unit,
      rate,
      amount: quantity * rate,
    };
  });
}

export async function buildCustomerOrderPayload(body, options = {}) {
  const { lockRatesToCatalog = false } = options;
  let items = normalizeItems(body.items || []);
  if (lockRatesToCatalog) {
    items = await applyCatalogSaleRates(body.items || []);
  }
  const subtotal = computeItemSubtotal(items);
  const transportCost = parseNum(body.transportCost);
  const loadingCost = parseNum(body.loadingCost);
  const taxAmount = parseNum(body.taxAmount);
  const discountAmount = parseNum(body.discountAmount);
  const totalAmount = subtotal + transportCost + loadingCost + taxAmount - discountAmount;

  return {
    items,
    subtotal,
    totalAmount,
    data: {
      orderDate: body.orderDate ? new Date(body.orderDate) : new Date(),
      shopId: body.shopId ? parseInt(body.shopId, 10) : null,
      companyId: body.companyId ? parseInt(body.companyId, 10) : null,
      customerName: body.customerName || "",
      subtotal,
      transportCost,
      loadingCost,
      taxAmount,
      discountAmount,
      totalAmount,
      notes: body.notes || null,
    },
  };
}

export const customerOrderInclude = {
  items: { include: { product: { select: { id: true, name: true, sku: true, unit: true } } } },
  shop: { select: { id: true, name: true, phone: true } },
  company: { select: { id: true, name: true, phone: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  reviewedBy: { select: { id: true, name: true } },
  saleOrder: { select: { id: true, invoiceNumber: true, status: true } },
};

const ACTIVE_PURCHASE_STATUSES = ["confirmed", "received"];

export function vendorRef(type, id) {
  return `${type}-${id}`;
}

export function parseVendorRef(ref) {
  if (!ref || typeof ref !== "string") return null;
  const [type, idPart] = ref.split("-");
  const id = parseInt(idPart, 10);
  if (!type || !Number.isFinite(id)) return null;
  if (type !== "farmer" && type !== "company") return null;
  return { type, id };
}

function purchaseVendorKey(purchase) {
  if (purchase.farmerId) return vendorRef("farmer", purchase.farmerId);
  if (purchase.companyId) return vendorRef("company", purchase.companyId);
  const name = (purchase.vendorName || "Unknown").trim().toLowerCase();
  return `other-${name}`;
}

function emptyVendorStats(base) {
  return {
    ...base,
    purchaseCount: 0,
    lineItemCount: 0,
    totalQuantity: 0,
    uniqueProducts: 0,
    totalAmount: 0,
    lastPurchaseDate: null,
    _productIds: new Set(),
  };
}

function applyPurchaseToVendor(vendor, purchase) {
  vendor.purchaseCount += 1;
  vendor.totalAmount += purchase.totalAmount || 0;
  const pDate = purchase.purchaseDate ? new Date(purchase.purchaseDate) : null;
  if (pDate && (!vendor.lastPurchaseDate || pDate > new Date(vendor.lastPurchaseDate))) {
    vendor.lastPurchaseDate = pDate.toISOString();
  }
  for (const item of purchase.items || []) {
    vendor.lineItemCount += 1;
    vendor.totalQuantity += item.quantity || 0;
    if (item.productId) vendor._productIds.add(item.productId);
  }
}

function finalizeVendor(vendor) {
  const { _productIds, ...rest } = vendor;
  return {
    ...rest,
    uniqueProducts: _productIds?.size || 0,
  };
}

export async function listPurchaseVendorAccounts(db) {
  const [farmers, companies, purchases] = await Promise.all([
    db.farmer.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        city: true,
        village: true,
        isActive: true,
        accountId: true,
      },
      orderBy: { name: "asc" },
    }),
    db.company.findMany({
      where: { companyType: { in: ["supplier", "both"] } },
      select: {
        id: true,
        name: true,
        phone: true,
        city: true,
        companyType: true,
        isActive: true,
        accountId: true,
      },
      orderBy: { name: "asc" },
    }),
    db.purchaseOrder.findMany({
      where: { status: { in: ACTIVE_PURCHASE_STATUSES } },
      include: { items: { select: { productId: true, quantity: true } } },
    }),
  ]);

  const vendorMap = new Map();

  for (const farmer of farmers) {
    const key = vendorRef("farmer", farmer.id);
    vendorMap.set(
      key,
      emptyVendorStats({
        key,
        ref: key,
        type: "farmer",
        entityId: farmer.id,
        name: farmer.name,
        phone: farmer.phone,
        city: farmer.city || farmer.village,
        isActive: farmer.isActive,
        accountId: farmer.accountId,
      })
    );
  }

  for (const company of companies) {
    const key = vendorRef("company", company.id);
    vendorMap.set(
      key,
      emptyVendorStats({
        key,
        ref: key,
        type: "company",
        entityId: company.id,
        name: company.name,
        phone: company.phone,
        city: company.city,
        companyType: company.companyType,
        isActive: company.isActive,
        accountId: company.accountId,
      })
    );
  }

  for (const purchase of purchases) {
    const key = purchaseVendorKey(purchase);
    if (!vendorMap.has(key)) {
      vendorMap.set(
        key,
        emptyVendorStats({
          key,
          ref: key,
          type: purchase.farmerId ? "farmer" : purchase.companyId ? "company" : "other",
          entityId: purchase.farmerId || purchase.companyId || null,
          name: purchase.vendorName || "Unknown vendor",
          phone: null,
          city: null,
          isActive: true,
          accountId: purchase.vendorAccountId || null,
        })
      );
    }
    applyPurchaseToVendor(vendorMap.get(key), purchase);
  }

  const accountIds = [...vendorMap.values()].map((v) => v.accountId).filter(Boolean);
  const accounts =
    accountIds.length > 0
      ? await db.account.findMany({
          where: { id: { in: accountIds } },
          select: { id: true, balance: true },
        })
      : [];
  const balanceByAccount = new Map(accounts.map((a) => [a.id, a.balance || 0]));

  const vendors = [...vendorMap.values()]
    .map((v) => {
      const row = finalizeVendor(v);
      row.balance = v.accountId ? balanceByAccount.get(v.accountId) || 0 : 0;
      return row;
    })
    .sort((a, b) => b.purchaseCount - a.purchaseCount || a.name.localeCompare(b.name));

  const summary = vendors.reduce(
    (acc, v) => ({
      vendors: vendors.length,
      withPurchases: acc.withPurchases + (v.purchaseCount > 0 ? 1 : 0),
      purchases: acc.purchases + v.purchaseCount,
      items: acc.items + v.lineItemCount,
      quantity: acc.quantity + v.totalQuantity,
      amount: acc.amount + v.totalAmount,
    }),
    { vendors: 0, withPurchases: 0, purchases: 0, items: 0, quantity: 0, amount: 0 }
  );

  return { vendors, summary };
}

export async function getPurchaseVendorDetail(db, type, entityId) {
  const where =
    type === "farmer"
      ? { farmerId: entityId, status: { in: ACTIVE_PURCHASE_STATUSES } }
      : { companyId: entityId, status: { in: ACTIVE_PURCHASE_STATUSES } };

  const [entity, purchases] = await Promise.all([
    type === "farmer"
      ? db.farmer.findUnique({
          where: { id: entityId },
          select: {
            id: true,
            name: true,
            phone: true,
            whatsappNumber: true,
            city: true,
            village: true,
            isActive: true,
            accountId: true,
          },
        })
      : db.company.findUnique({
          where: { id: entityId },
          select: {
            id: true,
            name: true,
            phone: true,
            whatsappNumber: true,
            city: true,
            companyType: true,
            isActive: true,
            accountId: true,
          },
        }),
    db.purchaseOrder.findMany({
      where,
      include: {
        items: {
          include: { product: { select: { id: true, name: true, sku: true, unit: true } } },
        },
      },
      orderBy: [{ purchaseDate: "desc" }, { id: "desc" }],
    }),
  ]);

  if (!entity) return null;

  let balance = 0;
  if (entity.accountId) {
    const account = await db.account.findUnique({
      where: { id: entity.accountId },
      select: { balance: true },
    });
    balance = account?.balance || 0;
  }

  const productMap = new Map();

  for (const purchase of purchases) {
    for (const item of purchase.items || []) {
      const pid = item.productId;
      const prev = productMap.get(pid) || {
        productId: pid,
        productName: item.productName,
        sku: item.product?.sku || null,
        unit: item.unit || item.product?.unit || "ea",
        totalQuantity: 0,
        totalAmount: 0,
        purchaseCount: 0,
        lastPurchaseDate: null,
        rates: [],
      };
      prev.totalQuantity += item.quantity || 0;
      prev.totalAmount += item.amount || 0;
      prev.purchaseCount += 1;
      if (item.rate) prev.rates.push(item.rate);
      const pDate = purchase.purchaseDate ? new Date(purchase.purchaseDate) : null;
      if (pDate && (!prev.lastPurchaseDate || pDate > new Date(prev.lastPurchaseDate))) {
        prev.lastPurchaseDate = pDate.toISOString();
      }
      productMap.set(pid, prev);
    }
  }

  const items = [...productMap.values()]
    .map((row) => ({
      ...row,
      avgRate: row.rates.length
        ? row.rates.reduce((s, r) => s + r, 0) / row.rates.length
        : row.totalQuantity > 0
          ? row.totalAmount / row.totalQuantity
          : 0,
      rates: undefined,
    }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity || a.productName.localeCompare(b.productName));

  const summary = {
    purchaseCount: purchases.length,
    lineItemCount: purchases.reduce((s, p) => s + (p.items?.length || 0), 0),
    uniqueProducts: items.length,
    totalQuantity: items.reduce((s, i) => s + i.totalQuantity, 0),
    totalAmount: purchases.reduce((s, p) => s + (p.totalAmount || 0), 0),
    balance,
  };

  const purchaseRows = purchases.map((p) => ({
    id: p.id,
    purchaseNumber: p.purchaseNumber,
    purchaseDate: p.purchaseDate,
    status: p.status,
    totalAmount: p.totalAmount,
    paidAmount: p.paidAmount,
    itemCount: p.items?.length || 0,
    totalQty: (p.items || []).reduce((s, i) => s + (i.quantity || 0), 0),
  }));

  return {
    vendor: {
      type,
      entityId: entity.id,
      ref: vendorRef(type, entity.id),
      name: entity.name,
      phone: entity.phone,
      whatsappNumber: entity.whatsappNumber,
      city: entity.city || entity.village,
      companyType: entity.companyType,
      isActive: entity.isActive,
      accountId: entity.accountId,
    },
    summary,
    items,
    purchases: purchaseRows,
  };
}

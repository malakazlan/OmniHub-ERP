import { saleBalanceDue } from "@/lib/purchase-settlement";

function buildDateFilter(from, to) {
  if (!from && !to) return null;
  const filter = {};
  if (from) filter.gte = new Date(from);
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    filter.lte = end;
  }
  return filter;
}

export async function getShopFinancials(db, shop, dateFilter = null) {
  if (!shop?.accountId) {
    return {
      balance: 0,
      receivable: 0,
      totalOut: 0,
      totalIn: 0,
      invoicePending: 0,
    };
  }

  const account = await db.account.findUnique({
    where: { id: shop.accountId },
    select: { balance: true },
  });
  const balance = account?.balance || 0;

  const ledgerWhere = { accountId: shop.accountId };
  if (dateFilter) ledgerWhere.date = dateFilter;

  const entries = await db.ledgerEntry.findMany({
    where: ledgerWhere,
    select: { debit: true, credit: true },
  });

  const totalOut = entries.reduce((sum, row) => sum + (row.debit || 0), 0);
  const totalIn = entries.reduce((sum, row) => sum + (row.credit || 0), 0);

  const openSales = await db.saleOrder.findMany({
    where: {
      shopId: shop.id,
      status: { in: ["confirmed", "dispatched", "delivered"] },
      paymentStatus: { in: ["unpaid", "partial"] },
    },
    select: { totalAmount: true, paidAmount: true },
  });
  const invoicePending = openSales.reduce((sum, sale) => sum + saleBalanceDue(sale), 0);

  return {
    balance,
    receivable: Math.max(balance, 0),
    totalOut,
    totalIn,
    invoicePending,
  };
}

export async function summarizeDealerShops(db, shops = [], { from, to } = {}) {
  const dateFilter = buildDateFilter(from, to);
  const shopRows = await Promise.all(
    shops.map(async (shop) => {
      const financials = await getShopFinancials(db, shop, dateFilter);
      return {
        id: shop.id,
        name: shop.name,
        city: shop.city,
        area: shop.area,
        phone: shop.phone,
        isActive: shop.isActive,
        accountId: shop.accountId,
        ...financials,
      };
    })
  );

  const summary = shopRows.reduce(
    (acc, row) => ({
      shopCount: shopRows.length,
      activeShops: acc.activeShops + (row.isActive ? 1 : 0),
      totalReceivable: acc.totalReceivable + row.receivable,
      totalOut: acc.totalOut + row.totalOut,
      totalIn: acc.totalIn + row.totalIn,
      invoicePending: acc.invoicePending + row.invoicePending,
    }),
    { shopCount: shopRows.length, activeShops: 0, totalReceivable: 0, totalOut: 0, totalIn: 0, invoicePending: 0 }
  );

  shopRows.sort((a, b) => b.receivable - a.receivable || a.name.localeCompare(b.name));

  return { summary, shops: shopRows };
}

export async function buildDealerListRow(db, dealer, shops) {
  const accountIds = shops.map((s) => s.accountId).filter(Boolean);
  let totalReceivable = 0;

  if (accountIds.length > 0) {
    const accounts = await db.account.findMany({
      where: { id: { in: accountIds } },
      select: { balance: true },
    });
    totalReceivable = accounts.reduce((sum, acc) => sum + Math.max(acc.balance || 0, 0), 0);
  }

  return {
    id: dealer.id,
    name: dealer.name,
    contactPerson: dealer.contactPerson,
    phone: dealer.phone,
    whatsappNumber: dealer.whatsappNumber,
    city: dealer.city,
    isActive: dealer.isActive,
    shopCount: shops.length,
    activeShops: shops.filter((s) => s.isActive).length,
    totalReceivable,
  };
}

/** Analytics rollup for all or filtered dealers in a date period. */
export async function buildDealersAnalytics(db, options = {}) {
  const { from, to, dealerId, city, status, sortBy = "pending" } = options;

  const where = {};
  if (dealerId) {
    const id = parseInt(dealerId, 10);
    if (Number.isFinite(id)) where.id = id;
  }
  if (city?.trim()) where.city = { contains: city.trim() };
  if (status === "active") where.isActive = true;
  if (status === "inactive") where.isActive = false;

  const dealers = await db.dealer.findMany({
    where,
    include: {
      shops: {
        select: {
          id: true,
          name: true,
          city: true,
          area: true,
          accountId: true,
          isActive: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const dateFilter = buildDateFilter(from, to);
  const rows = [];

  for (const dealer of dealers) {
    let totalOut = 0;
    let totalIn = 0;
    let totalReceivable = 0;
    let invoicePending = 0;
    let activeShops = 0;
    const shopRows = [];

    for (const shop of dealer.shops) {
      const fin = await getShopFinancials(db, shop, dateFilter);
      totalOut += fin.totalOut;
      totalIn += fin.totalIn;
      totalReceivable += fin.receivable;
      invoicePending += fin.invoicePending;
      if (shop.isActive) activeShops += 1;
      shopRows.push({
        id: shop.id,
        name: shop.name,
        city: shop.city,
        area: shop.area,
        isActive: shop.isActive,
        ...fin,
      });
    }

    shopRows.sort((a, b) => b.receivable - a.receivable || a.name.localeCompare(b.name));

    rows.push({
      id: dealer.id,
      name: dealer.name,
      city: dealer.city,
      phone: dealer.phone,
      isActive: dealer.isActive,
      shopCount: dealer.shops.length,
      activeShops,
      totalOut,
      totalIn,
      totalReceivable,
      invoicePending,
      collectionRate: totalOut > 0 ? Math.round((totalIn / totalOut) * 100) : 0,
      shops: shopRows,
    });
  }

  const sorters = {
    pending: (a, b) => b.totalReceivable - a.totalReceivable || a.name.localeCompare(b.name),
    out: (a, b) => b.totalOut - a.totalOut || a.name.localeCompare(b.name),
    in: (a, b) => b.totalIn - a.totalIn || a.name.localeCompare(b.name),
    name: (a, b) => a.name.localeCompare(b.name),
    shops: (a, b) => b.shopCount - a.shopCount || a.name.localeCompare(b.name),
  };
  rows.sort(sorters[sortBy] || sorters.pending);

  const topShops = rows
    .flatMap((d) =>
      d.shops.map((s) => ({
        ...s,
        dealerId: d.id,
        dealerName: d.name,
      }))
    )
    .sort((a, b) => b.receivable - a.receivable)
    .slice(0, 10);

  const summary = rows.reduce(
    (acc, row) => ({
      dealerCount: rows.length,
      shopCount: acc.shopCount + row.shopCount,
      totalOut: acc.totalOut + row.totalOut,
      totalIn: acc.totalIn + row.totalIn,
      totalReceivable: acc.totalReceivable + row.totalReceivable,
      invoicePending: acc.invoicePending + row.invoicePending,
    }),
    { dealerCount: 0, shopCount: 0, totalOut: 0, totalIn: 0, totalReceivable: 0, invoicePending: 0 }
  );

  summary.collectionRate =
    summary.totalOut > 0 ? Math.round((summary.totalIn / summary.totalOut) * 100) : 0;

  return {
    summary,
    dealers: rows,
    topShops,
    period: { from: from || null, to: to || null },
  };
}

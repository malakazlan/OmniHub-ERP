import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

const RECEIVED_CATEGORIES = new Set(["shop", "company"]);
const PAID_CATEGORIES = new Set(["farmer", "company", "shop", "transport", "salary", "general"]);

function weekRange() {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function aggregateByAccount(entries, direction) {
  const map = new Map();
  for (const entry of entries) {
    const acc = entry.account;
    if (!acc) continue;
    const amount = direction === "received" ? entry.credit || 0 : entry.debit || 0;
    if (amount <= 0) continue;

    const key = acc.id;
    const prev = map.get(key) || {
      accountId: acc.id,
      name: acc.name,
      category: acc.category,
      code: acc.code,
      amount: 0,
      transactions: 0,
    };
    prev.amount += amount;
    prev.transactions += 1;
    map.set(key, prev);
  }

  return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
}

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { start, end } = weekRange();

    const entries = await prisma.ledgerEntry.findMany({
      where: {
        date: { gte: start, lte: end },
        account: {
          isActive: true,
          category: {
            in: [...RECEIVED_CATEGORIES, ...PAID_CATEGORIES],
          },
        },
      },
      select: {
        debit: true,
        credit: true,
        account: { select: { id: true, name: true, category: true, code: true } },
      },
    });

    const receivedEntries = entries.filter((e) => RECEIVED_CATEGORIES.has(e.account.category));
    const paidEntries = entries.filter((e) => PAID_CATEGORIES.has(e.account.category));

    const received = aggregateByAccount(receivedEntries, "received");
    const paid = aggregateByAccount(paidEntries, "paid");

    return Response.json({
      success: true,
      period: { from: start.toISOString(), to: end.toISOString(), label: "Last 7 days" },
      received,
      paid,
      totals: {
        received: received.reduce((s, r) => s + r.amount, 0),
        paid: paid.reduce((s, r) => s + r.amount, 0),
      },
    });
  } catch (error) {
    console.error("Dashboard trading flow error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

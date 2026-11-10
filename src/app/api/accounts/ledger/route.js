import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { userCanAccessAccount } from "@/lib/accountAccess";
import { LEDGER_ENTRY_ORDER, applyRunningBalances } from "@/lib/ledger";
import { enrichLedgerEntriesWithLineItems } from "@/lib/ledgerEnrichment";

export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where = {};
    if (accountId) {
      const id = parseInt(accountId, 10);
      const allowed = await userCanAccessAccount(prisma, user, id);
      if (!allowed) {
        return Response.json({ error: "You do not have access to this account" }, { status: 403 });
      }
      where.accountId = id;
    }
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    // Statement order: oldest at top, newest at bottom.
    const entries = await prisma.ledgerEntry.findMany({
      where,
      include: accountId
        ? undefined
        : {
            account: {
              select: {
                id: true,
                name: true,
                code: true,
                type: true,
                category: true,
                phone: true,
                whatsappNumber: true,
              },
            },
          },
      orderBy: LEDGER_ENTRY_ORDER,
      ...(accountId ? {} : { take: 1000 }),
    });

    const account = accountId
      ? await prisma.account.findUnique({
          where: { id: parseInt(accountId) },
          select: {
            id: true,
            name: true,
            code: true,
            balance: true,
            type: true,
            category: true,
            phone: true,
            whatsappNumber: true,
          },
        })
      : null;

    // Balance brought forward for a date-ranged statement of one account.
    const openingByAccount = {};
    if (accountId && from) {
      const before = await prisma.ledgerEntry.aggregate({
        where: { accountId: where.accountId, date: { lt: new Date(from) } },
        _sum: { debit: true, credit: true },
      });
      openingByAccount[where.accountId] = (before._sum.debit || 0) - (before._sum.credit || 0);
    }

    const enrichedEntries = applyRunningBalances(
      await enrichLedgerEntriesWithLineItems(prisma, entries),
      openingByAccount
    );

    return Response.json({ success: true, account, entries: enrichedEntries });
  } catch (error) {
    console.error("Ledger fetch error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

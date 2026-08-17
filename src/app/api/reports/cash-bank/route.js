import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { cashAccountWhereForDirectory, userCanAccessAccount } from "@/lib/accountAccess";
import { LEDGER_ENTRY_ORDER } from "@/lib/ledger";
import { enrichLedgerEntriesWithLineItems } from "@/lib/ledgerEnrichment";

function parseCategory(value) {
  return value === "cash" || value === "bank" ? value : null;
}

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const category = parseCategory(searchParams.get("category"));
    if (!category) {
      return Response.json({ error: "category must be cash or bank" }, { status: 400 });
    }

    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const accountIdParam = searchParams.get("accountId");

    let accountWhere =
      category === "cash"
        ? { ...(await cashAccountWhereForDirectory(prisma, user)), isActive: true }
        : { category: "bank", isActive: true };

    const accounts = await prisma.account.findMany({
      where: accountWhere,
      select: { id: true, name: true, code: true, balance: true, phone: true, category: true },
      orderBy: [{ name: "asc" }],
    });

    const allowedIds = new Set(accounts.map((a) => a.id));
    let scopedAccountIds = [...allowedIds];

    if (accountIdParam) {
      const accountId = parseInt(accountIdParam, 10);
      if (!Number.isFinite(accountId) || !allowedIds.has(accountId)) {
        const allowed = await userCanAccessAccount(prisma, user, accountId);
        if (!allowed) {
          return Response.json({ error: "You do not have access to this account" }, { status: 403 });
        }
        scopedAccountIds = [accountId];
      } else {
        scopedAccountIds = [accountId];
      }
    }

    if (scopedAccountIds.length === 0) {
      return Response.json({
        success: true,
        summary: {
          accountCount: 0,
          totalBalance: 0,
          receipts: 0,
          payments: 0,
          entryCount: 0,
        },
        accounts: [],
        entries: [],
      });
    }

    const entryWhere = { accountId: { in: scopedAccountIds } };
    if (from || to) {
      entryWhere.date = {};
      if (from) entryWhere.date.gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        entryWhere.date.lte = end;
      }
    }

    const entries = await prisma.ledgerEntry.findMany({
      where: entryWhere,
      include: {
        account: { select: { id: true, name: true, code: true, category: true, phone: true } },
      },
      orderBy: LEDGER_ENTRY_ORDER,
      take: 3000,
    });

    const enrichedEntries = await enrichLedgerEntriesWithLineItems(prisma, entries);

    const receipts = enrichedEntries.reduce((sum, e) => sum + (e.debit || 0), 0);
    const payments = enrichedEntries.reduce((sum, e) => sum + (e.credit || 0), 0);
    const visibleAccounts =
      accountIdParam && scopedAccountIds.length === 1
        ? accounts.filter((a) => a.id === scopedAccountIds[0])
        : accounts;
    const totalBalance = visibleAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);

    return Response.json({
      success: true,
      summary: {
        accountCount: visibleAccounts.length,
        totalBalance,
        receipts,
        payments,
        entryCount: enrichedEntries.length,
      },
      accounts,
      entries: enrichedEntries,
    });
  } catch (error) {
    console.error("Cash/bank report error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

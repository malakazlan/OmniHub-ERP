import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { directoryCreateBlocked, requireProjectAccountsAdmin } from "@/lib/directoryCreate";
import { cashAccountWhereForDirectory, canBrowseAllCashAccounts } from "@/lib/accountAccess";
import { createCashLedgerAccount, assignUserPrimaryCash } from "@/lib/cashAccounts";
import { logActivity } from "@/lib/activityLog";
import { employeesByCashAccountIds } from "@/lib/accountRelations";

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const where = await cashAccountWhereForDirectory(prisma, user);

    const accounts = await prisma.account.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        ownerUser: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    const empByCash = await employeesByCashAccountIds(accounts.map((a) => a.id));
    const withEmployee = accounts.map((a) => ({
      ...a,
      employeeCash: empByCash[a.id] || null,
    }));

    return Response.json({ success: true, accounts: withEmployee, canManageAll: canBrowseAllCashAccounts(user) });
  } catch (error) {
    console.error("List directory cash accounts error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const blocked = directoryCreateBlocked(body);
    if (blocked) return blocked;

    const { name, openingBalance, assignToUserId, assignToAdmin } = body;
    if (!name?.trim()) {
      return Response.json({ error: "Cash account name is required" }, { status: 400 });
    }

    let ownerUserId = assignToUserId ? parseInt(assignToUserId, 10) : null;
    if (assignToAdmin) {
      const adminUser = await prisma.user.findFirst({
        where: { role: "admin", isActive: true },
        orderBy: { id: "asc" },
      });
      if (!adminUser) {
        return Response.json({ error: "No active admin user found to assign" }, { status: 400 });
      }
      ownerUserId = adminUser.id;
    }

    const account = await prisma.$transaction(async (tx) => {
      const created = await createCashLedgerAccount(tx, {
        name: name.trim(),
        openingBalance,
        ownerUserId,
      });
      if (ownerUserId) {
        await assignUserPrimaryCash(tx, ownerUserId, created.id);
      }
      return created;
    });

    logActivity({
      userId: user.userId,
      action: "CREATE",
      module: "accounts",
      entityType: "CashAccount",
      entityId: account.id,
      details: { name: account.name, ownerUserId },
      req,
    });

    return Response.json({ success: true, account }, { status: 201 });
  } catch (error) {
    console.error("Create directory cash account error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

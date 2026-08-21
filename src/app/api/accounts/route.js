import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { generateAccountCode } from "@/lib/receipt";
import { cashAccountWhereForUser } from "@/lib/accountAccess";
import { directoryCreateBlocked } from "@/lib/directoryCreate";
import { attachPartyMetaToAccounts } from "@/lib/accountRelations";
import { applyOpeningBalance } from "@/lib/accountOpening";

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const type = searchParams.get("type");
    const assignable = searchParams.get("assignable") === "1";

    const where = {};
    if (category) where.category = category;
    if (type) where.type = type;

    if (category === "cash" && assignable && user.role === "admin") {
      where.isActive = true;
    } else if (category === "cash") {
      const cashWhere = await cashAccountWhereForUser(prisma, user);
      Object.assign(where, cashWhere);
    } else if (!category) {
      const cashWhere = await cashAccountWhereForUser(prisma, user);
      where.OR = [{ category: { not: "cash" } }, cashWhere];
    }

    const accounts = await prisma.account.findMany({
      where,
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });

    const withParty = await attachPartyMetaToAccounts(accounts);

    return Response.json({ success: true, accounts: withParty });
  } catch (error) {
    console.error("List accounts error:", error);
    const msg = String(error?.message || "");
    if (error?.code === "ECONNRESET" || /ECONNRESET|pool timeout|connection timeout/i.test(msg)) {
      return Response.json(
        { error: "Database connection lost. Check that MySQL is running in XAMPP, then retry." },
        { status: 503 }
      );
    }
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Only admin can create accounts" }, { status: 403 });
    }

    const body = await req.json();
    if (body.category === "cash" || body.category === "bank") {
      const blocked = directoryCreateBlocked(body);
      if (blocked) return blocked;
    }

    const { name, type, category, city, phone, openingBalance, openingBalanceDate, reference } = body;

    if (!name || !type || !category) {
      return Response.json({ error: "Name, type, and category are required" }, { status: 400 });
    }

    const code = await generateAccountCode(category);

    const account = await prisma.account.create({
      data: {
        name,
        code,
        type,
        category,
        city,
        phone,
        openingBalance: 0,
        balance: 0,
        reference,
      },
    });

    await applyOpeningBalance(prisma, account.id, type, openingBalance, openingBalanceDate);

    const refreshed = await prisma.account.findUnique({ where: { id: account.id } });

    return Response.json({ success: true, account: refreshed }, { status: 201 });
  } catch (error) {
    console.error("Create account error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

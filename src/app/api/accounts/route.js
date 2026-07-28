import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { generateAccountCode } from "@/lib/receipt";
import { cashAccountWhereForUser, canAccessAllCashAccounts } from "@/lib/accountAccess";
import { directoryCreateBlocked } from "@/lib/directoryCreate";

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const type = searchParams.get("type");

    const where = {};
    if (category) where.category = category;
    if (type) where.type = type;

    if (category === "cash") {
      const cashWhere = await cashAccountWhereForUser(prisma, user);
      Object.assign(where, cashWhere);
    } else if (!canAccessAllCashAccounts(user) && !category) {
      // Non-finance users still see non-cash accounts in full lists; hide other users' cash.
      const cashWhere = await cashAccountWhereForUser(prisma, user);
      const allowedCashIds = await prisma.account.findMany({
        where: cashWhere,
        select: { id: true },
      });
      const cashIds = allowedCashIds.map((a) => a.id);
      where.OR = [{ category: { not: "cash" } }, { id: { in: cashIds.length ? cashIds : [-1] } }];
    }

    const accounts = await prisma.account.findMany({
      where,
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });

    return Response.json({ success: true, accounts });
  } catch (error) {
    console.error("List accounts error:", error);
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

    const { name, type, category, city, phone, openingBalance, reference } = body;

    if (!name || !type || !category) {
      return Response.json({ error: "Name, type, and category are required" }, { status: 400 });
    }

    const code = await generateAccountCode(category);
    const opening = parseFloat(openingBalance) || 0;

    const account = await prisma.account.create({
      data: {
        name,
        code,
        type,
        category,
        city,
        phone,
        openingBalance: opening,
        balance: opening,
        reference,
      },
    });

    if (opening !== 0) {
      await prisma.ledgerEntry.create({
        data: {
          accountId: account.id,
          date: new Date(),
          description: "Opening balance",
          debit: opening > 0 ? opening : 0,
          credit: opening < 0 ? Math.abs(opening) : 0,
          balance: opening,
        },
      });
    }

    return Response.json({ success: true, account }, { status: 201 });
  } catch (error) {
    console.error("Create account error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

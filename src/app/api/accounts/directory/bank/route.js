import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { directoryCreateBlocked, requireProjectAccountsAdmin } from "@/lib/directoryCreate";
import { generateAccountCode } from "@/lib/receipt";
import { logActivity } from "@/lib/activityLog";
import { attachBankMetaToLedgerAccounts } from "@/lib/accountRelations";

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const accounts = await prisma.account.findMany({
      where: { category: "bank" },
      orderBy: { name: "asc" },
    });

    const withMeta = await attachBankMetaToLedgerAccounts(accounts);

    return Response.json({ success: true, accounts: withMeta });
  } catch (error) {
    console.error("List directory bank accounts error:", error);
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

    const {
      bankName,
      accountTitle,
      accountNumber,
      branchCode,
      branchName,
      openingBalance,
      ledgerName,
    } = body;

    if (!bankName || !accountTitle || !accountNumber) {
      return Response.json(
        { error: "Bank name, account title, and account number are required" },
        { status: 400 }
      );
    }

    const code = await generateAccountCode("bank");
    const opening = parseFloat(openingBalance) || 0;
    const displayName = ledgerName?.trim() || `${bankName} — ${accountTitle}`;

    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.account.create({
        data: {
          name: displayName,
          code,
          type: "asset",
          category: "bank",
          reference: accountNumber,
          openingBalance: opening,
          balance: opening,
        },
      });

      if (opening !== 0) {
        await tx.ledgerEntry.create({
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

      const bankMeta = await tx.bankAccount.create({
        data: {
          bankName,
          accountTitle,
          accountNumber,
          branchCode: branchCode || null,
          branchName: branchName || null,
          ledgerAccountId: account.id,
        },
      });

      return { account, bankMeta };
    });

    logActivity({
      userId: user.userId,
      action: "CREATE",
      module: "accounts",
      entityType: "BankAccount",
      entityId: result.account.id,
      details: { name: result.account.name },
      req,
    });

    return Response.json({ success: true, ...result }, { status: 201 });
  } catch (error) {
    console.error("Create directory bank account error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

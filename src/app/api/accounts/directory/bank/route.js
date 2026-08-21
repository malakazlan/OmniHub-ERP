import prisma, { runTransaction } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { directoryCreateBlocked, requireProjectAccountsAdmin } from "@/lib/directoryCreate";
import { generateAccountCode } from "@/lib/receipt";
import { logActivity } from "@/lib/activityLog";
import { attachBankMetaToLedgerAccounts } from "@/lib/accountRelations";
import { applyOpeningBalance } from "@/lib/accountOpening";

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
      openingBalanceDate,
      ledgerName,
      phone,
    } = body;

    const displayName = ledgerName?.trim() || accountTitle?.trim() || bankName?.trim();
    if (!displayName) {
      return Response.json({ error: "Account name is required" }, { status: 400 });
    }
    if (!phone?.trim()) {
      return Response.json({ error: "Phone is required" }, { status: 400 });
    }

    const code = await generateAccountCode("bank");

    const result = await runTransaction(async (tx) => {
      const account = await tx.account.create({
        data: {
          name: displayName,
          code,
          type: "asset",
          category: "bank",
          phone: phone.trim(),
          reference: accountNumber?.trim() || null,
          openingBalance: 0,
          balance: 0,
        },
      });

      await applyOpeningBalance(tx, account.id, "asset", openingBalance, openingBalanceDate);

      const bankMeta = await tx.bankAccount.create({
        data: {
          bankName: bankName?.trim() || displayName,
          accountTitle: accountTitle?.trim() || displayName,
          accountNumber: accountNumber?.trim() || "—",
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

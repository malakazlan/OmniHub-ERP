import prisma, { runTransaction } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { generateDocumentNumber } from "@/lib/receipt";
import { createJournalEntry } from "@/lib/ledger";
import { logActivity } from "@/lib/activityLog";
import {
  OWNER_WITHDRAWAL_LEDGER_TEXT,
  getOrCreateOwnerDrawingsAccount,
  assertWithdrawalSourceAccount,
} from "@/lib/ownerWithdrawal";

function isAdmin(user) {
  return user?.role === "admin";
}

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!isAdmin(user)) {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where = {};
    if (from || to) {
      where.withdrawalDate = {};
      if (from) where.withdrawalDate.gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        where.withdrawalDate.lte = end;
      }
    }

    const withdrawals = await prisma.ownerWithdrawal.findMany({
      where,
      include: {
        sourceAccount: { select: { id: true, name: true, category: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { withdrawalDate: "desc" },
    });

    const total = withdrawals.reduce((s, w) => s + w.amount, 0);

    return Response.json({
      success: true,
      withdrawals,
      summary: { count: withdrawals.length, total },
    });
  } catch (error) {
    console.error("List owner withdrawals error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = getUserFromRequest(req);
    if (!isAdmin(user)) {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { withdrawalDate, amount, sourceAccountId, notes } = body;

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return Response.json({ error: "Amount must be greater than zero" }, { status: 400 });
    }
    if (!sourceAccountId) {
      return Response.json({ error: "Select a cash or bank account" }, { status: 400 });
    }

    const entryDate = withdrawalDate ? new Date(withdrawalDate) : new Date();
    const withdrawalNumber = await generateDocumentNumber("ownerWithdrawal", entryDate);

    const record = await runTransaction(async (tx) => {
      const sourceAccount = await assertWithdrawalSourceAccount(tx, sourceAccountId);
      if (sourceAccount.balance < parsedAmount) {
        throw new Error(`Insufficient balance in ${sourceAccount.name}. Available: ${sourceAccount.balance.toFixed(2)}`);
      }

      const drawingsAccount = await getOrCreateOwnerDrawingsAccount(tx);
      const paymentMethod = sourceAccount.category === "bank" ? "bank_transfer" : "cash";
      const ledgerText = OWNER_WITHDRAWAL_LEDGER_TEXT;

      const journal = await createJournalEntry(tx, {
        entryNumber: withdrawalNumber,
        entryDate,
        description: ledgerText,
        referenceType: "OwnerWithdrawal",
        lines: [
          {
            accountId: drawingsAccount.id,
            description: ledgerText,
            debit: parsedAmount,
            credit: 0,
          },
          {
            accountId: sourceAccount.id,
            description: ledgerText,
            debit: 0,
            credit: parsedAmount,
          },
        ],
      });

      const withdrawal = await tx.ownerWithdrawal.create({
        data: {
          withdrawalNumber,
          withdrawalDate: entryDate,
          amount: parsedAmount,
          paymentMethod,
          sourceAccountId: sourceAccount.id,
          notes: notes?.trim() || null,
          journalEntryId: journal.id,
          createdById: user.userId,
        },
        include: {
          sourceAccount: { select: { id: true, name: true, category: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });

      await tx.journalEntry.update({
        where: { id: journal.id },
        data: { referenceId: withdrawal.id },
      });

      return withdrawal;
    });

    await logActivity({
      userId: user.userId,
      action: "CREATE",
      module: "admin",
      entityType: "OwnerWithdrawal",
      entityId: record.id,
      details: { withdrawalNumber: record.withdrawalNumber, amount: record.amount },
      req,
    });

    return Response.json({ success: true, withdrawal: record }, { status: 201 });
  } catch (error) {
    console.error("Create owner withdrawal error:", error);
    return Response.json(
      { error: error.message || "Internal Server Error" },
      { status: error.message?.includes("Insufficient") || error.message?.includes("Select") ? 400 : 500 }
    );
  }
}

import prisma, { runTransaction } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { generateDocumentNumber } from "@/lib/receipt";
import { createJournalEntry } from "@/lib/ledger";
import { logActivity } from "@/lib/activityLog";
import {
  assertWithdrawalSourceAccount,
} from "@/lib/ownerWithdrawal";
import {
  canBrowseAllCashAccounts,
  userCanUseCashAccount,
} from "@/lib/accountAccess";
import {
  buildTransferDescription,
  isAllowedTransferType,
  mapJournalToTransfer,
  TRANSFER_TYPES,
  validateTransferPayload,
} from "@/lib/moneyTransfer";

function canManage(user) {
  return user && (user.role === "admin" || user.role === "manager" || user.role === "accountant");
}

async function assertTransferDestinationAccount(tx, accountId, expectedCategory) {
  const id = parseInt(accountId, 10);
  if (!Number.isFinite(id)) throw new Error("Select a destination account");

  const account = await tx.account.findFirst({
    where: { id, isActive: true, category: expectedCategory },
  });
  if (!account) {
    throw new Error(`Destination must be an active ${expectedCategory} account`);
  }
  return account;
}

async function assertUserCanTransferFromCash(user, accountId) {
  if (canBrowseAllCashAccounts(user)) return true;
  const allowed = await userCanUseCashAccount(prisma, user, accountId);
  if (!allowed) throw new Error("You can only transfer from your assigned cash account");
  return true;
}

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where = { referenceType: "MoneyTransfer" };
    if (from || to) {
      where.entryDate = {};
      if (from) where.entryDate.gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        where.entryDate.lte = end;
      }
    }

    const entries = await prisma.journalEntry.findMany({
      where,
      take: 500,
      include: {
        lines: {
          include: {
            account: { select: { id: true, name: true, category: true, code: true } },
          },
        },
      },
      orderBy: [{ entryDate: "desc" }, { id: "desc" }],
    });

    const transfers = entries.map((entry) => mapJournalToTransfer(entry));
    const total = transfers.reduce((sum, row) => sum + (row.amount || 0), 0);

    return Response.json({
      success: true,
      transfers,
      summary: { count: transfers.length, total },
    });
  } catch (error) {
    console.error("List money transfers error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = getUserFromRequest(req);
    if (!canManage(user)) return Response.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const {
      transferDate,
      transferType,
      fromAccountId,
      toAccountId,
      amount,
      description,
      notes,
    } = body;

    if (!isAllowedTransferType(transferType)) {
      return Response.json({ error: "Select a valid transfer type" }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { name: true },
    });

    const entryDate = transferDate ? new Date(transferDate) : new Date();
    const transferNumber = await generateDocumentNumber("transfer", entryDate);

    const record = await runTransaction(async (tx) => {
      const fromAccount = await assertWithdrawalSourceAccount(tx, fromAccountId);
      const toCategory = TRANSFER_TYPES[transferType]?.toCategory;
      const toAccount = await assertTransferDestinationAccount(tx, toAccountId, toCategory);

      if (fromAccount.category === "cash") {
        await assertUserCanTransferFromCash(user, fromAccount.id);
      }

      const parsedAmount = validateTransferPayload({
        transferType,
        fromAccountId,
        toAccountId,
        amount,
        fromAccount,
        toAccount,
      });

      const ledgerDescription = description?.trim() || buildTransferDescription(fromAccount, toAccount);
      const creditText = `Transfer to ${toAccount.name}`;
      const debitText = `Transfer from ${fromAccount.name}`;

      const journal = await createJournalEntry(tx, {
        entryNumber: transferNumber,
        entryDate,
        description: ledgerDescription,
        referenceType: "MoneyTransfer",
        notes: JSON.stringify({
          transferType,
          privateNotes: notes?.trim() || null,
          createdById: user.userId,
          createdByName: dbUser?.name || user.name || "System",
        }),
        lines: [
          {
            accountId: toAccount.id,
            description: debitText,
            debit: parsedAmount,
            credit: 0,
          },
          {
            accountId: fromAccount.id,
            description: creditText,
            debit: 0,
            credit: parsedAmount,
          },
        ],
      });

      return mapJournalToTransfer(
        {
          ...journal,
          lines: [
            {
              credit: parsedAmount,
              debit: 0,
              account: { id: fromAccount.id, name: fromAccount.name, category: fromAccount.category },
            },
            {
              debit: parsedAmount,
              credit: 0,
              account: { id: toAccount.id, name: toAccount.name, category: toAccount.category },
            },
          ],
        },
        dbUser?.name || user.name
      );
    });

    await logActivity({
      userId: user.userId,
      action: "CREATE",
      module: "accounts",
      entityType: "MoneyTransfer",
      entityId: record.id,
      details: {
        transferNumber: record.transferNumber,
        amount: record.amount,
        transferType: record.transferType,
      },
      req,
    });

    return Response.json({ success: true, transfer: record }, { status: 201 });
  } catch (error) {
    console.error("Create money transfer error:", error);
    const message = error.message || "Internal Server Error";
    const status =
      message.includes("Insufficient") ||
      message.includes("Select") ||
      message.includes("transfer") ||
      message.includes("Amount") ||
      message.includes("different") ||
      message.includes("assigned")
        ? 400
        : 500;
    return Response.json({ error: message }, { status });
  }
}

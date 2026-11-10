import prisma, { runTransaction } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { generateDocumentNumber } from "@/lib/receipt";
import { createJournalEntry } from "@/lib/ledger";
import { logActivity } from "@/lib/activityLog";
import { assertUserCanUseCashAccount } from "@/lib/userCashAccount";
import { canBrowseAllCashAccounts } from "@/lib/accountAccess";
import {
  assertDonationCashAccount,
  buildDonationLedgerText,
  getOrCreateDonationsExpenseAccount,
} from "@/lib/donation";

/** Stock and ledger flows run long interactive transactions; allow up to 60s on serverless hosts. */
export const maxDuration = 60;

function canManage(user) {
  return user && (user.role === "admin" || user.role === "manager" || user.role === "accountant");
}

export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where = {};
    if (from || to) {
      where.donationDate = {};
      if (from) where.donationDate.gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        where.donationDate.lte = end;
      }
    }

    const donations = await prisma.donation.findMany({
      where,
      include: {
        cashAccount: { select: { id: true, name: true, category: true, code: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: [{ donationDate: "desc" }, { id: "desc" }],
      take: 500,
    });

    const total = donations.reduce((sum, row) => sum + (row.amount || 0), 0);

    return Response.json({
      success: true,
      donations,
      summary: { count: donations.length, total },
    });
  } catch (error) {
    console.error("List donations error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!canManage(user)) return Response.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const { donationDate, amount, cashAccountId, purpose, beneficiary, notes } = body;

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return Response.json({ error: "Amount must be greater than zero" }, { status: 400 });
    }
    if (!cashAccountId) {
      return Response.json({ error: "Select a cash account" }, { status: 400 });
    }
    if (!purpose?.trim()) {
      return Response.json({ error: "Purpose is required" }, { status: 400 });
    }

    if (!canBrowseAllCashAccounts(user)) {
      try {
        await assertUserCanUseCashAccount(prisma, user, cashAccountId);
      } catch (err) {
        return Response.json({ error: err.message }, { status: 403 });
      }
    }

    const entryDate = donationDate ? new Date(donationDate) : new Date();
    const donationNumber = await generateDocumentNumber("donation", entryDate);
    const ledgerText = buildDonationLedgerText(purpose, beneficiary);

    const record = await runTransaction(async (tx) => {
      const cashAccount = await assertDonationCashAccount(tx, cashAccountId);
      if (cashAccount.balance < parsedAmount) {
        throw new Error(
          `Insufficient cash in ${cashAccount.name}. Available: ${Number(cashAccount.balance || 0).toLocaleString()}`
        );
      }

      const donationsAccount = await getOrCreateDonationsExpenseAccount(tx);

      const journal = await createJournalEntry(tx, {
        entryNumber: donationNumber,
        entryDate,
        description: ledgerText,
        referenceType: "Donation",
        notes: JSON.stringify({
          purpose: purpose.trim(),
          beneficiary: beneficiary?.trim() || null,
          privateNotes: notes?.trim() || null,
        }),
        lines: [
          {
            accountId: donationsAccount.id,
            description: ledgerText,
            debit: parsedAmount,
            credit: 0,
          },
          {
            accountId: cashAccount.id,
            description: ledgerText,
            debit: 0,
            credit: parsedAmount,
          },
        ],
      });

      const donation = await tx.donation.create({
        data: {
          donationNumber,
          donationDate: entryDate,
          amount: parsedAmount,
          cashAccountId: cashAccount.id,
          purpose: purpose.trim(),
          beneficiary: beneficiary?.trim() || null,
          notes: notes?.trim() || null,
          journalEntryId: journal.id,
          createdById: user.userId,
        },
        include: {
          cashAccount: { select: { id: true, name: true, category: true, code: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });

      await tx.journalEntry.update({
        where: { id: journal.id },
        data: { referenceId: donation.id },
      });

      return donation;
    });

    await logActivity({
      userId: user.userId,
      action: "CREATE",
      module: "accounts",
      entityType: "Donation",
      entityId: record.id,
      details: { donationNumber: record.donationNumber, amount: record.amount, purpose: record.purpose },
      req,
    });

    return Response.json({ success: true, donation: record }, { status: 201 });
  } catch (error) {
    console.error("Create donation error:", error);
    const message = error.message || "Internal Server Error";
    const status =
      message.includes("Insufficient") ||
      message.includes("Select") ||
      message.includes("cash") ||
      message.includes("Purpose")
        ? 400
        : 500;
    return Response.json({ error: message }, { status });
  }
}

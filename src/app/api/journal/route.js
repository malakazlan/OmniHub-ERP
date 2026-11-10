import prisma, { runTransaction } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { generateDocumentNumber } from "@/lib/receipt";
import { createJournalEntry } from "@/lib/ledger";
import { logActivity } from "@/lib/activityLog";

/** Stock and ledger flows run long interactive transactions; allow up to 60s on serverless hosts. */
export const maxDuration = 60;

function canManage(user) {
  return user && (user.role === "admin" || user.role === "manager" || user.role === "accountant");
}

export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const entries = await prisma.journalEntry.findMany({
      include: { lines: { include: { account: { select: { id: true, name: true } } } } },
      orderBy: { entryDate: "desc" },
    });

    return Response.json({ success: true, entries });
  } catch (error) {
    console.error("List journal entries error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!canManage(user)) return Response.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const { entryDate, description, lines, notes } = body;

    if (!description) return Response.json({ error: "Description is required" }, { status: 400 });
    if (!lines || !Array.isArray(lines) || lines.length < 2) {
      return Response.json({ error: "At least two lines are required for a balanced journal entry" }, { status: 400 });
    }

    const normalizedLines = lines
      .map((l) => ({
        accountId: parseInt(l.accountId, 10),
        description: l.description || null,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
      }))
      .filter((l) => l.accountId && (l.debit > 0 || l.credit > 0));

    if (normalizedLines.length < 2) {
      return Response.json({ error: "At least two valid lines with amounts are required" }, { status: 400 });
    }

    const totalDebit = normalizedLines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = normalizedLines.reduce((s, l) => s + l.credit, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return Response.json({ error: `Entry is not balanced: Debit ${totalDebit} ≠ Credit ${totalCredit}` }, { status: 400 });
    }

    const date = entryDate ? new Date(entryDate) : new Date();
    const entryNumber = await generateDocumentNumber("journal", date);

    const journal = await runTransaction(async (tx) => {
      return createJournalEntry(tx, {
        entryNumber,
        entryDate: date,
        description,
        referenceType: "Manual",
        lines: normalizedLines,
        notes,
      });
    });

    logActivity({
      userId: user.userId,
      action: "CREATE",
      module: "accounts",
      entityType: "JournalEntry",
      entityId: journal.id,
      details: { entryNumber, totalDebit, description },
      req,
    });

    return Response.json({ success: true, journal }, { status: 201 });
  } catch (error) {
    console.error("Create journal entry error:", error);
    if (error.message?.includes("unbalanced") || error.message?.includes("not found")) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

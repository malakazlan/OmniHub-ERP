import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { generateDocumentNumber } from "@/lib/receipt";
import { createLedgerEntry } from "@/lib/ledger";
import { logActivity } from "@/lib/activityLog";

function canManage(user) {
  return user && (user.role === "admin" || user.role === "manager" || user.role === "accountant");
}

async function attachAccountNames(payments) {
  const accountIds = [
    ...new Set(payments.flatMap((p) => [p.fromAccountId, p.toAccountId]).filter(Boolean)),
  ];
  if (accountIds.length === 0) return payments.map((p) => ({ ...p, fromAccount: null, toAccount: null }));

  const accounts = await prisma.account.findMany({
    where: { id: { in: accountIds } },
    select: { id: true, name: true, category: true },
  });
  const map = Object.fromEntries(accounts.map((a) => [a.id, a]));

  return payments.map((p) => ({
    ...p,
    fromAccount: p.fromAccountId ? map[p.fromAccountId] || null : null,
    toAccount: p.toAccountId ? map[p.toAccountId] || null : null,
  }));
}

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where = {};
    if (from || to) {
      where.paymentDate = {};
      if (from) where.paymentDate.gte = new Date(from);
      if (to) where.paymentDate.lte = new Date(to);
    }

    const payments = await prisma.payment.findMany({
      where,
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: { paymentDate: "desc" },
    });

    const withAccounts = await attachAccountNames(payments);

    return Response.json({ success: true, payments: withAccounts });
  } catch (error) {
    console.error("List payments error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = getUserFromRequest(req);
    if (!canManage(user)) return Response.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const {
      paymentDate, paymentMethod, amount, fromAccountId, toAccountId,
      description, chequeNumber, bankName, notes,
    } = body;

    const parsedAmount = parseFloat(amount) || 0;
    if (parsedAmount <= 0) {
      return Response.json({ error: "Amount must be greater than zero" }, { status: 400 });
    }
    if (!fromAccountId && !toAccountId) {
      return Response.json({ error: "Select at least a from or to account" }, { status: 400 });
    }
    if (!description) {
      return Response.json({ error: "Description is required" }, { status: 400 });
    }

    const fromId = fromAccountId ? parseInt(fromAccountId, 10) : null;
    const toId = toAccountId ? parseInt(toAccountId, 10) : null;
    const date = paymentDate ? new Date(paymentDate) : new Date();

    const [fromAccount, toAccount] = await Promise.all([
      fromId ? prisma.account.findUnique({ where: { id: fromId } }) : null,
      toId ? prisma.account.findUnique({ where: { id: toId } }) : null,
    ]);

    if (fromId && !fromAccount) return Response.json({ error: "From account not found" }, { status: 404 });
    if (toId && !toAccount) return Response.json({ error: "To account not found" }, { status: 404 });

    const paymentNumber = await generateDocumentNumber("payment", date);
    const accountName = toAccount?.name || fromAccount?.name || "—";

    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          paymentNumber,
          paymentDate: date,
          paymentMethod: paymentMethod || "cash",
          amount: parsedAmount,
          fromAccountId: fromId,
          toAccountId: toId,
          accountName,
          description,
          chequeNumber: chequeNumber || null,
          bankName: bankName || null,
          notes: notes || null,
          createdById: user.userId,
        },
      });

      if (fromId) {
        await createLedgerEntry(tx, {
          accountId: fromId,
          date,
          description: `Payment ${paymentNumber}: ${description}`,
          reference: paymentNumber,
          referenceType: "Payment",
          referenceId: created.id,
          credit: parsedAmount,
        });
      }

      if (toId) {
        await createLedgerEntry(tx, {
          accountId: toId,
          date,
          description: `Payment ${paymentNumber}: ${description}`,
          reference: paymentNumber,
          referenceType: "Payment",
          referenceId: created.id,
          debit: parsedAmount,
        });
      }

      return created;
    });

    logActivity({
      userId: user.userId,
      action: "CREATE",
      module: "accounts",
      entityType: "Payment",
      entityId: payment.id,
      details: { paymentNumber, amount: parsedAmount, description },
      req,
    });

    return Response.json({ success: true, payment }, { status: 201 });
  } catch (error) {
    console.error("Create payment error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

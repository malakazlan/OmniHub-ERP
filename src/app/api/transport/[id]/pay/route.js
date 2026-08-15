import prisma, { runTransaction } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { createLedgerEntry } from "@/lib/ledger";
import { computePaymentStatus } from "@/lib/order-processing";
import { logActivity } from "@/lib/activityLog";
import { assertUserCanUseCashAccount } from "@/lib/userCashAccount";

function canManage(user) {
  return user && (user.role === "admin" || user.role === "manager" || user.role === "accountant");
}

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

async function findDriverAccount(driverName) {
  const name = driverName?.trim();
  if (!name) return null;

  const accounts = await prisma.account.findMany({
    where: { category: "transport", isActive: true },
    select: { id: true, name: true },
  });

  const lower = name.toLowerCase();
  return accounts.find((a) => a.name?.trim().toLowerCase() === lower) || null;
}

export async function POST(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!canManage(user)) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const transportId = parseInt(id, 10);
    if (!Number.isFinite(transportId)) {
      return Response.json({ error: "Invalid transport id" }, { status: 400 });
    }

    const body = await req.json();
    const { accountId, amount, paymentDate, notes } = body;

    if (!accountId) {
      return Response.json({ error: "Select a cash or bank account to pay from" }, { status: 400 });
    }

    const parsedAmount = roundMoney(amount);
    if (parsedAmount <= 0) {
      return Response.json({ error: "Amount must be greater than zero" }, { status: 400 });
    }

    const existing = await prisma.transport.findUnique({ where: { id: transportId } });
    if (!existing) {
      return Response.json({ error: "Transport not found" }, { status: 404 });
    }

    const totalCharges = roundMoney(existing.totalCharges);
    if (totalCharges <= 0) {
      return Response.json(
        { error: "This trip has no freight charges. Edit the trip and add charges before paying." },
        { status: 400 }
      );
    }

    const balanceDue = roundMoney(totalCharges - (existing.paidAmount || 0));
    if (balanceDue <= 0) {
      return Response.json({ error: "This trip is already fully paid" }, { status: 400 });
    }
    if (parsedAmount > balanceDue + 0.009) {
      return Response.json(
        { error: `Payment exceeds balance due (${balanceDue.toFixed(2)})` },
        { status: 400 }
      );
    }

    const payAccountId = parseInt(accountId, 10);
    if (!Number.isFinite(payAccountId)) {
      return Response.json({ error: "Invalid payment account selected" }, { status: 400 });
    }

    const payAccount = await prisma.account.findFirst({
      where: { id: payAccountId, isActive: true, category: { in: ["cash", "bank"] } },
    });
    if (!payAccount) {
      return Response.json({ error: "Payment account must be an active cash or bank account" }, { status: 400 });
    }

    if (payAccount.category === "cash" && user.role !== "admin" && user.role !== "manager") {
      try {
        await assertUserCanUseCashAccount(prisma, user, payAccountId);
      } catch (err) {
        return Response.json({ error: err.message }, { status: 403 });
      }
    }

    const driverAccount = await findDriverAccount(existing.driverName);
    const date = paymentDate ? new Date(paymentDate) : new Date();
    const newPaid = roundMoney((existing.paidAmount || 0) + parsedAmount);
    const paymentStatus = computePaymentStatus(newPaid, totalCharges);
    const ledgerDesc = notes
      ? `Trip freight · ${existing.transportNumber} · ${notes}`
      : `Trip freight · ${existing.transportNumber} · ${existing.driverName}`;
    const ledgerRef = `TRP-${transportId}-${Date.now()}`;

    const transport = await runTransaction(async (tx) => {
      const updated = await tx.transport.update({
        where: { id: transportId },
        data: {
          paidAmount: newPaid,
          paymentStatus,
          paymentAccountId: payAccountId,
        },
        include: {
          vehicle: { select: { id: true, registrationNumber: true, vehicleType: true } },
        },
      });

      if (driverAccount) {
        await createLedgerEntry(tx, {
          accountId: driverAccount.id,
          date,
          description: ledgerDesc,
          reference: ledgerRef,
          referenceType: "Transport",
          referenceId: transportId,
          debit: parsedAmount,
        });
      }

      await createLedgerEntry(tx, {
        accountId: payAccountId,
        date,
        description: ledgerDesc,
        reference: ledgerRef,
        referenceType: "Transport",
        referenceId: transportId,
        credit: parsedAmount,
      });

      return updated;
    });

    logActivity({
      userId: user.userId,
      action: "UPDATE",
      module: "transport",
      entityType: "Transport",
      entityId: transport.id,
      details: {
        action: "payment",
        amount: parsedAmount,
        accountId: payAccountId,
        driverAccountId: driverAccount?.id || null,
        paymentStatus: transport.paymentStatus,
      },
      req,
    });

    return Response.json({ success: true, transport });
  } catch (error) {
    console.error("Transport payment error:", error);
    return Response.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

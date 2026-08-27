import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { buildPaymentReceipt } from "@/lib/ledgerPayment";

async function loadCompanySettings() {
  const rows = await prisma.setting.findMany();
  const map = {};
  for (const s of rows) map[s.key] = s.value;
  return map;
}

export async function GET(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!id) return Response.json({ error: "Payment ID required" }, { status: 400 });

    const numId = parseInt(id, 10);
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { id: isNaN(numId) ? -1 : numId },
          { paymentNumber: id },
        ],
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!payment) {
      return Response.json({ error: "Payment not found" }, { status: 404 });
    }

    const fromAccount = payment.fromAccountId
      ? await prisma.account.findUnique({ where: { id: payment.fromAccountId } })
      : null;
    const toAccount = payment.toAccountId
      ? await prisma.account.findUnique({ where: { id: payment.toAccountId } })
      : null;

    let mode = "pay";
    let partyAccount = null;
    let cashAccount = null;
    let bankAccount = null;

    if (fromAccount && (fromAccount.category === "cash" || fromAccount.category === "bank")) {
      mode = "pay";
      partyAccount = toAccount;
      if (fromAccount.category === "cash") cashAccount = fromAccount;
      if (fromAccount.category === "bank") bankAccount = fromAccount;
    } else if (toAccount && (toAccount.category === "cash" || toAccount.category === "bank")) {
      mode = "receive";
      partyAccount = fromAccount;
      if (toAccount.category === "cash") cashAccount = toAccount;
      if (toAccount.category === "bank") bankAccount = toAccount;
    } else {
      partyAccount = toAccount || fromAccount;
      mode = "pay";
    }

    let cashAmount = 0;
    let bankAmount = 0;
    if (payment.paymentMethod === "bank_transfer" || payment.paymentMethod === "cheque") {
      bankAmount = payment.amount;
    } else {
      cashAmount = payment.amount;
    }

    const company = await loadCompanySettings();
    const currentBalance = partyAccount?.balance ?? 0;
    const previousBalance = mode === "pay"
      ? currentBalance + payment.amount
      : currentBalance - payment.amount;

    const receipt = buildPaymentReceipt({
      payment,
      mode,
      partyAccount,
      cashAccount,
      bankAccount,
      cashAmount,
      bankAmount,
      totalAmount: payment.amount,
      previousBalance,
      currentBalance,
      company,
      createdBy: payment.createdBy,
      description: payment.description,
      notes: payment.notes,
    });

    return Response.json({ success: true, payment: receipt });
  } catch (error) {
    console.error("Fetch payment error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import prisma, { runTransaction } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { generateDocumentNumber } from "@/lib/receipt";
import { createLedgerEntry } from "@/lib/ledger";
import { logActivity } from "@/lib/activityLog";
import { parseNum, computePaymentStatus } from "@/lib/order-processing";
import { resolveUserCashAccountId, assertUserCanUseCashAccount } from "@/lib/userCashAccount";
import {
  buildPaymentReceipt,
  resolvePaymentMethod,
} from "@/lib/ledgerPayment";
import {
  VENDOR_ACCOUNT_CATEGORIES,
  CUSTOMER_ACCOUNT_CATEGORIES,
  findOutstandingPurchasesForLedgerAccount,
  findOutstandingSalesForLedgerAccount,
  planFifoPurchaseSettlement,
  planFifoSaleSettlement,
  formatPurchaseClearSummary,
  formatSaleClearSummary,
  applyPurchaseAllocations,
  applySaleAllocations,
} from "@/lib/purchase-settlement";

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

async function loadCompanySettings() {
  const rows = await prisma.setting.findMany();
  const map = {};
  for (const s of rows) map[s.key] = s.value;
  return map;
}

async function resolveCashAccountId(user, cashAccountId, cashAmount) {
  if (parseNum(cashAmount) <= 0) return null;
  let id = cashAccountId;
  if (!id) {
    id = await resolveUserCashAccountId(prisma, user.userId);
  }
  await assertUserCanUseCashAccount(prisma, user, id);
  return id;
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
      paymentDate,
      description,
      chequeNumber,
      bankName,
      notes,
      mode: bodyMode,
      partyAccountId: bodyPartyId,
    } = body;

    const cashAmount = parseNum(body.cashAmount);
    const bankAmount = parseNum(body.bankAmount);
    const legacyAmount = parseNum(body.amount);
    const total = cashAmount + bankAmount > 0 ? cashAmount + bankAmount : legacyAmount;

    if (total <= 0) {
      return Response.json({ error: "Amount must be greater than zero" }, { status: 400 });
    }
    if (!description?.trim()) {
      return Response.json({ error: "Description is required" }, { status: 400 });
    }

    const date = paymentDate ? new Date(paymentDate) : new Date();
    const isSplit = cashAmount + bankAmount > 0;
    const mode = bodyMode || (body.fromAccountId && !isSplit ? "receive" : "pay");

    let partyAccountId = bodyPartyId ? parseInt(bodyPartyId, 10) : null;
    let cashAccountId = body.cashAccountId ? parseInt(body.cashAccountId, 10) : null;
    let bankAccountId = body.bankAccountId ? parseInt(body.bankAccountId, 10) : null;

    if (isSplit) {
      if (!partyAccountId) {
        partyAccountId =
          mode === "pay"
            ? parseInt(body.toAccountId, 10)
            : parseInt(body.fromAccountId, 10);
      }
      if (!partyAccountId) {
        return Response.json({ error: "Party account is required" }, { status: 400 });
      }
      if (cashAmount > 0) {
        cashAccountId = await resolveCashAccountId(user, cashAccountId, cashAmount);
        if (!cashAccountId) {
          return Response.json({ error: "Select a cash account" }, { status: 400 });
        }
      }
      if (bankAmount > 0 && !bankAccountId) {
        return Response.json({ error: "Select a bank account" }, { status: 400 });
      }
    } else {
      const fromId = body.fromAccountId ? parseInt(body.fromAccountId, 10) : null;
      const toId = body.toAccountId ? parseInt(body.toAccountId, 10) : null;
      if (!fromId && !toId) {
        return Response.json({ error: "Select at least a from or to account" }, { status: 400 });
      }
      partyAccountId = mode === "pay" ? toId : fromId;
      if (mode === "pay") cashAccountId = fromId;
      else cashAccountId = toId;
    }

    const partyAccount = await prisma.account.findUnique({ where: { id: partyAccountId } });
    if (!partyAccount) return Response.json({ error: "Party account not found" }, { status: 404 });

    const [cashAccount, bankAccount] = await Promise.all([
      cashAccountId ? prisma.account.findUnique({ where: { id: cashAccountId } }) : null,
      bankAccountId ? prisma.account.findUnique({ where: { id: bankAccountId } }) : null,
    ]);

    if (cashAmount > 0 && cashAccountId && !cashAccount) {
      return Response.json({ error: "Cash account not found" }, { status: 404 });
    }
    if (bankAmount > 0 && bankAccountId && !bankAccount) {
      return Response.json({ error: "Bank account not found" }, { status: 404 });
    }

    const previousBalance = partyAccount.balance ?? 0;
    const paymentNumber = await generateDocumentNumber("payment", date);
    const paymentMethod = resolvePaymentMethod(
      isSplit ? cashAmount : total,
      isSplit ? bankAmount : 0,
      body.paymentMethod || "cash"
    );

    const primaryFromId = mode === "pay" ? cashAccountId || bankAccountId : partyAccountId;
    const primaryToId = mode === "pay" ? partyAccountId : cashAccountId || bankAccountId;

    const result = await runTransaction(async (tx) => {
      let billsCleared = [];
      let clearSummary = "";

      if (mode === "pay" && VENDOR_ACCOUNT_CATEGORIES.has(partyAccount.category)) {
        const purchases = await findOutstandingPurchasesForLedgerAccount(tx, partyAccountId);
        const plan = planFifoPurchaseSettlement(
          purchases,
          isSplit ? cashAmount : total,
          isSplit ? bankAmount : 0
        );
        clearSummary = formatPurchaseClearSummary(plan.allocations);
        if (plan.allocations.length > 0) {
          billsCleared = await applyPurchaseAllocations(
            tx,
            plan.allocations,
            partyAccountId,
            computePaymentStatus
          );
        }
      } else if (mode === "receive" && CUSTOMER_ACCOUNT_CATEGORIES.has(partyAccount.category)) {
        const sales = await findOutstandingSalesForLedgerAccount(tx, partyAccountId);
        const plan = planFifoSaleSettlement(sales, total);
        clearSummary = formatSaleClearSummary(plan.allocations);
        if (plan.allocations.length > 0) {
          billsCleared = await applySaleAllocations(
            tx,
            plan.allocations,
            partyAccountId,
            computePaymentStatus
          );
        }
      }

      const splitNote =
        isSplit && cashAmount > 0 && bankAmount > 0
          ? `Cash ${cashAmount.toFixed(2)} + Bank ${bankAmount.toFixed(2)}`
          : "";
      const fullDescription = clearSummary
        ? `${description.trim()} — ${clearSummary}`
        : description.trim();
      const fullNotes = [notes, splitNote].filter(Boolean).join("\n") || null;

      const created = await tx.payment.create({
        data: {
          paymentNumber,
          paymentDate: date,
          paymentMethod,
          amount: total,
          fromAccountId: primaryFromId,
          toAccountId: primaryToId,
          accountName: partyAccount.name,
          description: fullDescription,
          chequeNumber: chequeNumber || null,
          bankName: bankName || bankAccount?.name || null,
          notes: fullNotes,
          createdById: user.userId,
        },
      });

      const refBase = `Payment ${paymentNumber}: ${fullDescription}`;

      if (mode === "pay") {
        if (isSplit) {
          if (cashAmount > 0 && cashAccountId) {
            await createLedgerEntry(tx, {
              accountId: cashAccountId,
              date,
              description: refBase,
              reference: paymentNumber,
              referenceType: "Payment",
              referenceId: created.id,
              credit: cashAmount,
            });
          }
          if (bankAmount > 0 && bankAccountId) {
            await createLedgerEntry(tx, {
              accountId: bankAccountId,
              date,
              description: refBase,
              reference: paymentNumber,
              referenceType: "Payment",
              referenceId: created.id,
              credit: bankAmount,
            });
          }
        } else if (primaryFromId) {
          await createLedgerEntry(tx, {
            accountId: primaryFromId,
            date,
            description: refBase,
            reference: paymentNumber,
            referenceType: "Payment",
            referenceId: created.id,
            credit: total,
          });
        }
        await createLedgerEntry(tx, {
          accountId: partyAccountId,
          date,
          description: refBase,
          reference: paymentNumber,
          referenceType: "Payment",
          referenceId: created.id,
          debit: total,
        });
      } else {
        await createLedgerEntry(tx, {
          accountId: partyAccountId,
          date,
          description: refBase,
          reference: paymentNumber,
          referenceType: "Payment",
          referenceId: created.id,
          credit: total,
        });
        if (isSplit) {
          if (cashAmount > 0 && cashAccountId) {
            await createLedgerEntry(tx, {
              accountId: cashAccountId,
              date,
              description: refBase,
              reference: paymentNumber,
              referenceType: "Payment",
              referenceId: created.id,
              debit: cashAmount,
            });
          }
          if (bankAmount > 0 && bankAccountId) {
            await createLedgerEntry(tx, {
              accountId: bankAccountId,
              date,
              description: refBase,
              reference: paymentNumber,
              referenceType: "Payment",
              referenceId: created.id,
              debit: bankAmount,
            });
          }
        } else if (primaryToId) {
          await createLedgerEntry(tx, {
            accountId: primaryToId,
            date,
            description: refBase,
            reference: paymentNumber,
            referenceType: "Payment",
            referenceId: created.id,
            debit: total,
          });
        }
      }

      const updatedParty = await tx.account.findUnique({
        where: { id: partyAccountId },
        select: { balance: true, name: true, category: true },
      });

      return {
        payment: created,
        billsCleared,
        clearSummary,
        currentBalance: updatedParty?.balance ?? 0,
      };
    });

    const company = await loadCompanySettings();
    const creator = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { name: true },
    });

    const receiptCash = isSplit
      ? cashAmount
      : cashAccount?.category === "cash"
        ? total
        : 0;
    const receiptBank = isSplit
      ? bankAmount
      : bankAccount?.category === "bank" || (cashAccount?.category === "bank")
        ? total
        : 0;

    const receipt = buildPaymentReceipt({
      payment: result.payment,
      mode,
      partyAccount,
      cashAccount: cashAccount?.category === "cash" ? cashAccount : null,
      bankAccount: bankAccount || (cashAccount?.category === "bank" ? cashAccount : null),
      cashAmount: receiptCash,
      bankAmount: receiptBank,
      totalAmount: total,
      previousBalance,
      currentBalance: result.currentBalance,
      billsCleared: result.billsCleared,
      clearSummary: result.clearSummary,
      company,
      createdBy: creator,
      description: result.payment.description,
      notes: result.payment.notes,
    });

    logActivity({
      userId: user.userId,
      action: "CREATE",
      module: "accounts",
      entityType: "Payment",
      entityId: result.payment.id,
      details: {
        paymentNumber,
        amount: total,
        mode,
        description: result.payment.description,
        billsCleared: result.billsCleared?.length || 0,
      },
      req,
    });

    return Response.json(
      {
        success: true,
        payment: result.payment,
        billsCleared: result.billsCleared,
        receipt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create payment error:", error);
    return Response.json(
      { error: error.message || "Internal Server Error" },
      { status: error.message?.includes("cash account") ? 403 : 500 }
    );
  }
}

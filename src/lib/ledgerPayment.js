import { parseNum } from "@/lib/order-processing";

export function parseLedgerPaymentBody(body) {
  const cashAmount = parseNum(body.cashAmount);
  const bankAmount = parseNum(body.bankAmount);
  const legacyAmount = parseNum(body.amount);
  const total =
    cashAmount + bankAmount > 0 ? cashAmount + bankAmount : legacyAmount;

  const cashAccountId = body.cashAccountId ? parseInt(body.cashAccountId, 10) : null;
  const bankAccountId = body.bankAccountId ? parseInt(body.bankAccountId, 10) : null;
  const fromAccountId = body.fromAccountId ? parseInt(body.fromAccountId, 10) : null;
  const toAccountId = body.toAccountId ? parseInt(body.toAccountId, 10) : null;

  let mode = body.mode;
  if (!mode) {
    if (toAccountId && (cashAmount + bankAmount > 0 || (fromAccountId && legacyAmount > 0))) {
      mode = cashAmount + bankAmount > 0 && !fromAccountId ? "pay" : null;
    }
    if (fromAccountId && (cashAmount + bankAmount > 0 || (toAccountId && legacyAmount > 0))) {
      mode = mode || "receive";
    }
  }

  // Split pay: toAccountId = party, cash/bank are sources
  // Split receive: fromAccountId = party, cash/bank are destinations
  const isSplit = cashAmount + bankAmount > 0;

  if (isSplit) {
    if (body.partyAccountId) {
      const partyId = parseInt(body.partyAccountId, 10);
      mode = body.mode || (body.direction === "receive" ? "receive" : "pay");
      if (mode === "pay") {
        return {
          mode: "pay",
          partyAccountId: partyId,
          cashAmount,
          bankAmount,
          total,
          cashAccountId,
          bankAccountId,
          isSplit: true,
        };
      }
      return {
        mode: "receive",
        partyAccountId: partyId,
        cashAmount,
        bankAmount,
        total,
        cashAccountId,
        bankAccountId,
        isSplit: true,
      };
    }
  }

  return {
    mode: fromAccountId && !toAccountId ? "receive" : "pay",
    partyAccountId: null,
    cashAmount: isSplit ? cashAmount : legacyAmount,
    bankAmount: isSplit ? bankAmount : 0,
    total: legacyAmount || total,
    cashAccountId: isSplit ? cashAccountId : fromAccountId || toAccountId,
    bankAccountId: isSplit ? bankAccountId : null,
    fromAccountId,
    toAccountId,
    isSplit,
    legacyAmount,
  };
}

export function resolvePaymentMethod(cashAmount, bankAmount, fallback = "cash") {
  const cash = parseNum(cashAmount);
  const bank = parseNum(bankAmount);
  if (cash > 0 && bank > 0) return "mixed";
  if (bank > 0) return "bank_transfer";
  if (cash > 0) return "cash";
  return fallback;
}

export function buildPaymentReceipt({
  payment,
  mode,
  partyAccount,
  cashAccount,
  bankAccount,
  cashAmount,
  bankAmount,
  totalAmount,
  previousBalance,
  currentBalance,
  billsCleared,
  clearSummary,
  company,
  createdBy,
  description,
  notes,
}) {
  const isPay = mode === "pay";
  return {
    paymentNumber: payment.paymentNumber,
    paymentDate: payment.paymentDate,
    mode,
    title: isPay ? "Payment voucher" : "Receipt voucher",
    partyName: partyAccount?.name || payment.accountName,
    partyCategory: partyAccount?.category || null,
    partyWhatsApp: partyAccount?.whatsappNumber || partyAccount?.phone || null,
    partyPhone: partyAccount?.phone || null,
    cashAmount: parseNum(cashAmount),
    bankAmount: parseNum(bankAmount),
    totalAmount: parseNum(totalAmount),
    cashAccountName: cashAccount?.name || null,
    bankAccountName: bankAccount?.name || null,
    paymentMethod: payment.paymentMethod,
    description: description || payment.description,
    notes: notes || payment.notes,
    previousBalance: Math.abs(parseNum(previousBalance)),
    pendingBalance: Math.abs(parseNum(currentBalance)),
    totalReceived: isPay ? 0 : parseNum(totalAmount),
    totalPaid: isPay ? parseNum(totalAmount) : 0,
    billsCleared: billsCleared || [],
    clearSummary: clearSummary || "",
    company: company || {},
    createdByName: createdBy?.name || null,
  };
}

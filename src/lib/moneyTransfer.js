export const TRANSFER_TYPES = {
  cash_cash: {
    id: "cash_cash",
    label: "Cash to Cash",
    shortLabel: "Cash → Cash",
    description: "Move funds between cash accounts",
    fromCategory: "cash",
    toCategory: "cash",
  },
  cash_bank: {
    id: "cash_bank",
    label: "Cash to Bank",
    shortLabel: "Cash → Bank",
    description: "Deposit cash into a bank account",
    fromCategory: "cash",
    toCategory: "bank",
  },
  bank_bank: {
    id: "bank_bank",
    label: "Bank to Bank",
    shortLabel: "Bank → Bank",
    description: "Transfer between bank accounts",
    fromCategory: "bank",
    toCategory: "bank",
  },
  bank_cash: {
    id: "bank_cash",
    label: "Bank to Cash",
    shortLabel: "Bank → Cash",
    description: "Withdraw from bank into cash account",
    fromCategory: "bank",
    toCategory: "cash",
  },
};

export function deriveTransferType(fromAccount, toAccount) {
  if (!fromAccount || !toAccount) return null;
  const key = `${fromAccount.category}_${toAccount.category}`;
  if (TRANSFER_TYPES[key]) return key;
  return null;
}

export function isAllowedTransferType(type) {
  return Boolean(TRANSFER_TYPES[type]);
}

export function transferTypeLabel(type) {
  return TRANSFER_TYPES[type]?.shortLabel || type || "—";
}

export function accountsForTransferSide(accounts, type, side) {
  const config = TRANSFER_TYPES[type];
  if (!config) return [];
  const category = side === "from" ? config.fromCategory : config.toCategory;
  return accounts.filter((a) => a.isActive !== false && a.category === category);
}

export function validateTransferPayload({ transferType, fromAccountId, toAccountId, amount, fromAccount, toAccount }) {
  if (!isAllowedTransferType(transferType)) {
    throw new Error("Select a valid transfer type");
  }
  if (!fromAccountId || !toAccountId) {
    throw new Error("Select both source and destination accounts");
  }
  if (String(fromAccountId) === String(toAccountId)) {
    throw new Error("Source and destination accounts must be different");
  }
  if (!fromAccount || !toAccount) {
    throw new Error("Selected accounts were not found");
  }

  const expected = TRANSFER_TYPES[transferType];
  if (fromAccount.category !== expected.fromCategory || toAccount.category !== expected.toCategory) {
    throw new Error(`This transfer must be ${expected.shortLabel}`);
  }

  const parsedAmount = parseFloat(amount);
  if (!parsedAmount || parsedAmount <= 0) {
    throw new Error("Amount must be greater than zero");
  }
  if (fromAccount.balance < parsedAmount) {
    throw new Error(
      `Insufficient balance in ${fromAccount.name}. Available: ${Number(fromAccount.balance || 0).toLocaleString()}`
    );
  }

  return parsedAmount;
}

export function buildTransferDescription(fromAccount, toAccount) {
  return `Transfer: ${fromAccount.name} → ${toAccount.name}`;
}

export function mapJournalToTransfer(entry, createdByName = null) {
  const creditLine = entry.lines?.find((l) => l.credit > 0);
  const debitLine = entry.lines?.find((l) => l.debit > 0);
  const fromAccount = creditLine?.account || null;
  const toAccount = debitLine?.account || null;

  let meta = {};
  try {
    meta = entry.notes ? JSON.parse(entry.notes) : {};
  } catch {
    meta = {};
  }

  return {
    id: entry.id,
    transferNumber: entry.entryNumber,
    transferDate: entry.entryDate,
    amount: entry.totalDebit,
    transferType: meta.transferType || deriveTransferType(fromAccount, toAccount),
    description: entry.description,
    notes: meta.privateNotes || null,
    fromAccount,
    toAccount,
    createdByName: meta.createdByName || createdByName,
    journalEntryId: entry.id,
  };
}

import prisma from "./prisma";

const PREFIXES = {
  purchase: "PO",
  sale: "INV",
  purchaseReturn: "PR",
  saleReturn: "SR",
  payment: "PAY",
  expense: "EXP",
  transport: "TR",
  gatePass: "GP",
  journal: "JE",
  customerOrder: "ORD",
  ownerWithdrawal: "WD",
};

/**
 * Generate next sequential document number: PREFIX-YYYY0001
 */
export async function generateDocumentNumber(type, date = new Date()) {
  const prefix = PREFIXES[type];
  if (!prefix) throw new Error(`Unknown document type: ${type}`);

  const year = date.getFullYear();
  const pattern = `${prefix}-${year}`;

  const counters = {
    purchase: () => prisma.purchaseOrder.findMany({ where: { purchaseNumber: { startsWith: pattern } }, select: { purchaseNumber: true }, orderBy: { purchaseNumber: "desc" }, take: 1 }),
    sale: () => prisma.saleOrder.findMany({ where: { invoiceNumber: { startsWith: pattern } }, select: { invoiceNumber: true }, orderBy: { invoiceNumber: "desc" }, take: 1 }),
    purchaseReturn: () => prisma.purchaseReturn.findMany({ where: { returnNumber: { startsWith: pattern } }, select: { returnNumber: true }, orderBy: { returnNumber: "desc" }, take: 1 }),
    saleReturn: () => prisma.saleReturn.findMany({ where: { returnNumber: { startsWith: pattern } }, select: { returnNumber: true }, orderBy: { returnNumber: "desc" }, take: 1 }),
    payment: () => prisma.payment.findMany({ where: { paymentNumber: { startsWith: pattern } }, select: { paymentNumber: true }, orderBy: { paymentNumber: "desc" }, take: 1 }),
    expense: () => prisma.expense.findMany({ where: { expenseNumber: { startsWith: pattern } }, select: { expenseNumber: true }, orderBy: { expenseNumber: "desc" }, take: 1 }),
    transport: () => prisma.transport.findMany({ where: { transportNumber: { startsWith: pattern } }, select: { transportNumber: true }, orderBy: { transportNumber: "desc" }, take: 1 }),
    gatePass: () => prisma.gatePass.findMany({ where: { gatePassNumber: { startsWith: pattern } }, select: { gatePassNumber: true }, orderBy: { gatePassNumber: "desc" }, take: 1 }),
    journal: () => prisma.journalEntry.findMany({ where: { entryNumber: { startsWith: pattern } }, select: { entryNumber: true }, orderBy: { entryNumber: "desc" }, take: 1 }),
    customerOrder: () => prisma.customerOrder.findMany({ where: { orderNumber: { startsWith: pattern } }, select: { orderNumber: true }, orderBy: { orderNumber: "desc" }, take: 1 }),
    ownerWithdrawal: () => prisma.ownerWithdrawal.findMany({ where: { withdrawalNumber: { startsWith: pattern } }, select: { withdrawalNumber: true }, orderBy: { withdrawalNumber: "desc" }, take: 1 }),
  };

  const fieldMap = {
    purchase: "purchaseNumber",
    sale: "invoiceNumber",
    purchaseReturn: "returnNumber",
    saleReturn: "returnNumber",
    payment: "paymentNumber",
    expense: "expenseNumber",
    transport: "transportNumber",
    gatePass: "gatePassNumber",
    journal: "entryNumber",
    customerOrder: "orderNumber",
    ownerWithdrawal: "withdrawalNumber",
  };

  const fetcher = counters[type];
  const results = await fetcher();
  const field = fieldMap[type];

  let nextSeq = 1;
  if (results.length > 0) {
    const last = results[0][field];
    const seqPart = last.replace(`${pattern}`, "");
    const parsed = parseInt(seqPart, 10);
    if (!isNaN(parsed)) nextSeq = parsed + 1;
  }

  return `${pattern}${String(nextSeq).padStart(4, "0")}`;
}

export async function generateAccountCode(category, db = prisma) {
  const prefix = category.toUpperCase().slice(0, 3);
  // Require trailing segment (ACC-CAS-001) so seed codes like ACC-CASH / ACC-BANK are not matched.
  const codePrefix = `ACC-${prefix}-`;
  const accounts = await db.account.findMany({
    where: { code: { startsWith: codePrefix } },
    select: { code: true },
    orderBy: { code: "desc" },
    take: 1,
  });

  let nextSeq = 1;
  if (accounts.length > 0 && accounts[0].code) {
    const parts = accounts[0].code.split("-");
    const parsed = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(parsed)) nextSeq = parsed + 1;
  }

  return `${codePrefix}${String(nextSeq).padStart(3, "0")}`;
}

export async function generateSKU(categoryName) {
  const prefix = categoryName.replace(/\s+/g, "").slice(0, 3).toUpperCase();
  const products = await prisma.product.findMany({
    where: { sku: { startsWith: prefix } },
    select: { sku: true },
    orderBy: { sku: "desc" },
    take: 1,
  });

  let nextSeq = 1;
  if (products.length > 0 && products[0].sku) {
    const parsed = parseInt(products[0].sku.replace(prefix, ""), 10);
    if (!isNaN(parsed)) nextSeq = parsed + 1;
  }

  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}

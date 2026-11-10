/**
 * Remove every record created by a smoke-test run, identified by its tag
 * (scripts/smoke.mjs names everything it creates with a random tag such as
 * SMKMWB3EQHQ). Deletes in dependency order inside one transaction, then
 * recomputes affected account balances from the remaining ledger entries.
 *
 * Usage: node scripts/purge-tagged.mjs SMKMWB3EQHQ
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { parseDatabaseUrl } from "../src/lib/dbConfig.mjs";

const TAG = (process.argv[2] || "").trim();
if (!/^[A-Z0-9]{6,}$/.test(TAG)) {
  console.error("Usage: node scripts/purge-tagged.mjs <TAG>   (uppercase letters/digits, 6+ chars)");
  process.exit(1);
}
const like = { contains: TAG };

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(parseDatabaseUrl(process.env.DATABASE_URL, { connectionLimit: 3 })),
});

async function main() {
  const summary = {};
  const count = (k, n) => (summary[k] = (summary[k] || 0) + n);

  await prisma.$transaction(
    async (tx) => {
      const companies = await tx.company.findMany({ where: { name: like }, select: { id: true, accountId: true } });
      const employees = await tx.employee.findMany({ where: { name: like }, select: { id: true, accountId: true, cashAccountId: true } });
      const vehicles = await tx.vehicle.findMany({ where: { OR: [{ registrationNumber: like }, { driverName: like }] }, select: { id: true, accountId: true, driverAccountId: true } });
      const products = await tx.product.findMany({ where: { name: like }, select: { id: true } });
      const taggedAccounts = await tx.account.findMany({ where: { name: like }, select: { id: true } });

      const companyIds = companies.map((c) => c.id);
      const productIds = products.map((p) => p.id);
      const accountIds = [
        ...new Set(
          [
            ...taggedAccounts.map((a) => a.id),
            ...companies.map((c) => c.accountId),
            ...employees.flatMap((e) => [e.accountId, e.cashAccountId]),
            ...vehicles.flatMap((v) => [v.accountId, v.driverAccountId]),
          ].filter(Boolean)
        ),
      ];

      const purchases = await tx.purchaseOrder.findMany({
        where: { OR: [{ vendorName: like }, companyIds.length ? { companyId: { in: companyIds } } : { id: -1 }] },
        select: { id: true, purchaseNumber: true },
      });
      const sales = await tx.saleOrder.findMany({
        where: { OR: [{ customerName: like }, companyIds.length ? { companyId: { in: companyIds } } : { id: -1 }] },
        select: { id: true, invoiceNumber: true },
      });
      const purchaseIds = purchases.map((p) => p.id);
      const saleIds = sales.map((s) => s.id);

      const pReturns = await tx.purchaseReturn.findMany({ where: { purchaseId: { in: purchaseIds.length ? purchaseIds : [-1] } }, select: { id: true, returnNumber: true } });
      const sReturns = await tx.saleReturn.findMany({ where: { saleId: { in: saleIds.length ? saleIds : [-1] } }, select: { id: true, returnNumber: true } });
      const payments = await tx.payment.findMany({
        where: { OR: [{ description: like }, { notes: like }, accountIds.length ? { fromAccountId: { in: accountIds } } : { id: -1 }, accountIds.length ? { toAccountId: { in: accountIds } } : { id: -1 }] },
        select: { id: true, paymentNumber: true },
      });
      const journals = await tx.journalEntry.findMany({
        where: { OR: [{ description: like }, { notes: like }, { lines: { some: { accountId: { in: accountIds.length ? accountIds : [-1] } } } }] },
        select: { id: true, entryNumber: true },
      });
      const withdrawals = await tx.ownerWithdrawal.findMany({ where: { OR: [{ notes: like }, { privateNote: like }, { description: like }] }, select: { id: true, withdrawalNumber: true } }).catch(() => []);
      const orders = await tx.customerOrder.findMany({ where: { OR: [{ notes: like }, companyIds.length ? { companyId: { in: companyIds } } : { id: -1 }] }, select: { id: true, orderNumber: true } });
      const trips = await tx.transport.findMany({ where: { OR: [{ loadDescription: like }, { driverName: like }, { vehicleId: { in: vehicles.length ? vehicles.map((v) => v.id) : [-1] } }] }, select: { id: true, transportNumber: true } });

      const refs = [
        ...purchases.map((p) => p.purchaseNumber),
        ...sales.map((s) => s.invoiceNumber),
        ...pReturns.map((r) => r.returnNumber),
        ...sReturns.map((r) => r.returnNumber),
        ...payments.map((p) => p.paymentNumber),
        ...journals.map((j) => j.entryNumber),
        ...withdrawals.map((w) => w.withdrawalNumber),
        ...trips.map((t) => t.transportNumber),
      ].filter(Boolean);

      // Ledger entries first: by account, by document reference, or by tagged text.
      const le = await tx.ledgerEntry.deleteMany({
        where: {
          OR: [
            accountIds.length ? { accountId: { in: accountIds } } : { id: -1 },
            refs.length ? { reference: { in: refs } } : { id: -1 },
            { description: like },
          ],
        },
      });
      count("ledgerEntries", le.count);

      const ids = (arr) => (arr.length ? arr.map((x) => x.id) : [-1]);
      count("journalLines", (await tx.journalLine.deleteMany({ where: { journalEntryId: { in: ids(journals) } } })).count);
      count("journals", (await tx.journalEntry.deleteMany({ where: { id: { in: ids(journals) } } })).count);
      count("withdrawals", (await tx.ownerWithdrawal.deleteMany({ where: { id: { in: ids(withdrawals) } } })).count);
      count("payments", (await tx.payment.deleteMany({ where: { id: { in: ids(payments) } } })).count);
      count("purchaseReturns", (await tx.purchaseReturn.deleteMany({ where: { id: { in: ids(pReturns) } } })).count);
      count("saleReturns", (await tx.saleReturn.deleteMany({ where: { id: { in: ids(sReturns) } } })).count);
      count("stockMovements", (await tx.stockMovement.deleteMany({ where: { OR: [{ productId: { in: productIds.length ? productIds : [-1] } }, refs.length ? { reference: { in: refs } } : { id: -1 }] } })).count);
      count("saleItems", (await tx.saleItem.deleteMany({ where: { saleOrderId: { in: ids(sales) } } })).count);
      count("gatePasses", (await tx.gatePass.deleteMany({ where: { saleOrderId: { in: ids(sales) } } })).count);
      count("customerOrderItems", (await tx.customerOrderItem.deleteMany({ where: { customerOrderId: { in: ids(orders) } } })).count);
      count("customerOrders", (await tx.customerOrder.deleteMany({ where: { id: { in: ids(orders) } } })).count);
      count("sales", (await tx.saleOrder.deleteMany({ where: { id: { in: ids(sales) } } })).count);
      count("purchaseItems", (await tx.purchaseItem.deleteMany({ where: { purchaseOrderId: { in: ids(purchases) } } })).count);
      count("transports", (await tx.transport.deleteMany({ where: { id: { in: ids(trips) } } })).count);
      count("purchases", (await tx.purchaseOrder.deleteMany({ where: { id: { in: ids(purchases) } } })).count);
      count("vehicleExpenses", (await tx.vehicleExpense.deleteMany({ where: { OR: [{ vehicleId: { in: ids(vehicles) } }, { description: like }] } })).count);
      count("vehicles", (await tx.vehicle.deleteMany({ where: { id: { in: ids(vehicles) } } })).count);
      for (const model of ["employeeAttendance", "salaryRecord", "salaryAdvance", "employeeCommission"]) {
        count(model, (await tx[model].deleteMany({ where: { employeeId: { in: ids(employees) } } })).count);
      }
      count("employees", (await tx.employee.deleteMany({ where: { id: { in: ids(employees) } } })).count);
      count("products", (await tx.product.deleteMany({ where: { id: { in: ids(products) } } })).count);
      count("companies", (await tx.company.deleteMany({ where: { id: { in: ids(companies) } } })).count);
      count("users", (await tx.user.deleteMany({ where: { OR: [{ email: { contains: TAG.toLowerCase() } }, { name: like }] } })).count);
      count("accounts", (await tx.account.deleteMany({ where: { id: { in: accountIds.length ? accountIds : [-1] } } })).count);
      count("activityLogs", (await tx.activityLog.deleteMany({ where: { details: like } })).count);
    },
    { maxWait: 30_000, timeout: 300_000 }
  );

  // Recompute every account balance from what is left.
  const sums = await prisma.ledgerEntry.groupBy({ by: ["accountId"], _sum: { debit: true, credit: true } });
  const sumById = new Map(sums.map((s) => [s.accountId, Math.round(((s._sum.debit || 0) - (s._sum.credit || 0)) * 100) / 100]));
  const accounts = await prisma.account.findMany({ select: { id: true, balance: true } });
  let fixed = 0;
  for (const a of accounts) {
    const expected = sumById.get(a.id) || 0;
    if (Math.abs(expected - (a.balance || 0)) > 0.005) {
      await prisma.account.update({ where: { id: a.id }, data: { balance: expected } });
      fixed += 1;
    }
  }
  summary.balancesRecomputed = fixed;
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((e) => {
    console.error("Purge failed:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

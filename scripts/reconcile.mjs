/**
 * Integrity check for the ledger and document registers.
 *
 * Reports:
 *   - accounts whose stored balance differs from the sum of their ledger entries
 *   - purchase orders and invoices whose stored paymentStatus disagrees with paid/total
 *   - ledger entries that point at a missing account
 *
 * Usage:
 *   node scripts/reconcile.mjs          # report only, exit 1 when mismatches exist
 *   node scripts/reconcile.mjs --fix    # also repair paymentStatus and account balances
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { parseDatabaseUrl } from "../src/lib/dbConfig.mjs";

const FIX = process.argv.includes("--fix");
const EPS = 0.005;

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(parseDatabaseUrl(process.env.DATABASE_URL, { connectionLimit: 3 })),
});

function paymentStatus(paid, total) {
  if (paid <= EPS) return "unpaid";
  if (paid + EPS >= total) return "paid";
  return "partial";
}

async function main() {
  let problems = 0;

  // 1. Account balances vs ledger sums
  const sums = await prisma.ledgerEntry.groupBy({
    by: ["accountId"],
    _sum: { debit: true, credit: true },
  });
  const sumById = new Map(sums.map((s) => [s.accountId, (s._sum.debit || 0) - (s._sum.credit || 0)]));
  const accounts = await prisma.account.findMany({ select: { id: true, name: true, balance: true } });
  const accountIds = new Set(accounts.map((a) => a.id));
  for (const a of accounts) {
    const expected = Math.round((sumById.get(a.id) || 0) * 100) / 100;
    if (Math.abs(expected - (a.balance || 0)) > EPS) {
      problems += 1;
      console.log(`balance  account #${a.id} ${a.name}: stored ${a.balance} expected ${expected}`);
      if (FIX) await prisma.account.update({ where: { id: a.id }, data: { balance: expected } });
    }
  }

  // 2. Orphan ledger entries
  for (const s of sums) {
    if (!accountIds.has(s.accountId)) {
      problems += 1;
      console.log(`orphan   ledger entries reference missing account #${s.accountId}`);
    }
  }

  // 3. Payment status on purchase orders and invoices
  for (const [label, model, numberField] of [
    ["purchase", prisma.purchaseOrder, "purchaseNumber"],
    ["invoice ", prisma.saleOrder, "invoiceNumber"],
  ]) {
    const rows = await model.findMany({
      select: { id: true, [numberField]: true, totalAmount: true, paidAmount: true, paymentStatus: true, status: true },
    });
    for (const r of rows) {
      if (r.status === "cancelled") continue;
      const expected = paymentStatus(r.paidAmount || 0, r.totalAmount || 0);
      if (expected !== r.paymentStatus) {
        problems += 1;
        console.log(`status   ${label} ${r[numberField]}: stored ${r.paymentStatus} expected ${expected}`);
        if (FIX) await model.update({ where: { id: r.id }, data: { paymentStatus: expected } });
      }
    }
  }

  if (problems === 0) {
    console.log("Reconciliation OK: balances, ledger references and payment statuses are consistent.");
  } else {
    console.log(`${problems} mismatch(es) ${FIX ? "repaired" : "found (run with --fix to repair statuses and balances)"}.`);
  }
  process.exit(problems > 0 && !FIX ? 1 : 0);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

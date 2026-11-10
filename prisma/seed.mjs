/**
 * Seed the minimum an installation needs to log in and post transactions:
 * one admin login, the default cash and bank ledger accounts, item categories
 * and a starter city list.
 *
 * Safe to run repeatedly. It never overwrites an existing admin's password:
 * ADMIN_PASSWORD is only used when the admin user is first created, so running
 * the seed against a live database cannot lock anyone out.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";
import { parseDatabaseUrl } from "../src/lib/dbConfig.mjs";

/** Env-file loaders sometimes keep surrounding quotes; never let them into stored values. */
const unquote = (value) => String(value ?? "").trim().replace(/^["']|["']$/g, "");
const ADMIN_EMAIL = unquote(process.env.ADMIN_EMAIL).toLowerCase();
const ADMIN_PASSWORD = unquote(process.env.ADMIN_PASSWORD);

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("Seed aborted: ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env.");
  process.exit(1);
}
if (ADMIN_PASSWORD.length < 10) {
  console.error("Seed aborted: ADMIN_PASSWORD must be at least 10 characters.");
  process.exit(1);
}

const ALL_MODULES = [
  "dashboard", "companies", "products", "purchases", "sales", "orders",
  "transport", "accounts", "hr", "reports", "settings",
];

const ITEM_CATEGORIES = ["Plumbing", "Electrical", "Fasteners", "Tools", "Safety", "Packaging"];
const CITIES = ["Portland", "Seattle", "Boise", "Sacramento", "Denver", "Phoenix", "Salt Lake City"];

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(parseDatabaseUrl(process.env.DATABASE_URL, { connectionLimit: 3 })),
});

async function main() {
  const existingAdmin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

  const admin = existingAdmin
    ? await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { role: "admin", isActive: true, allowedModules: JSON.stringify(ALL_MODULES) },
      })
    : await prisma.user.create({
        data: {
          email: ADMIN_EMAIL,
          name: "Administrator",
          password: await bcrypt.hash(ADMIN_PASSWORD, 12),
          role: "admin",
          allowedModules: JSON.stringify(ALL_MODULES),
        },
      });
  console.log(existingAdmin ? `Admin ${ADMIN_EMAIL} already exists (password unchanged).` : `Admin ${ADMIN_EMAIL} created.`);

  for (const name of ITEM_CATEGORIES) {
    await prisma.productCategory.upsert({ where: { name }, update: {}, create: { name } });
  }

  let cash = await prisma.account.findFirst({ where: { code: "ACC-CASH" } });
  if (!cash) {
    cash = await prisma.account.create({
      data: { name: "Cash on Hand", code: "ACC-CASH", type: "asset", category: "cash", balance: 0, openingBalance: 0 },
    });
  }
  if (!admin.cashAccountId) {
    await prisma.user.update({ where: { id: admin.id }, data: { cashAccountId: cash.id } });
  }
  if (!cash.ownerUserId) {
    await prisma.account.update({ where: { id: cash.id }, data: { ownerUserId: admin.id } });
  }

  const bank = await prisma.account.findFirst({ where: { code: "ACC-BANK" } });
  if (!bank) {
    await prisma.account.create({
      data: { name: "Operating Checking", code: "ACC-BANK", type: "asset", category: "bank", balance: 0, openingBalance: 0 },
    });
  }

  for (const name of CITIES) {
    await prisma.city.upsert({ where: { name }, update: {}, create: { name } });
  }

  console.log("Seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

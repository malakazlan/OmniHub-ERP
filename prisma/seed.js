require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaMariaDb } = require("@prisma/adapter-mariadb");
const bcrypt = require("bcryptjs");

const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "metro@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "metro1234";

async function main() {
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      password: hashedPassword,
      name: "Metro Admin",
      role: "admin",
      isActive: true,
      allowedModules: JSON.stringify([
        "dashboard", "farmers", "companies", "shops", "products",
        "purchases", "sales", "transport", "accounts", "hr", "reports", "settings",
      ]),
    },
    create: {
      email: ADMIN_EMAIL,
      name: "Metro Admin",
      password: hashedPassword,
      role: "admin",
      allowedModules: JSON.stringify([
        "dashboard", "farmers", "companies", "shops", "products",
        "purchases", "sales", "transport", "accounts", "hr", "reports", "settings",
      ]),
    },
  });
  console.log(`Admin user ready: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);

  const defaultCategories = ["Raw Materials", "Finished Feed", "Additives", "Packaging"];
  for (const name of defaultCategories) {
    await prisma.productCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const cashAccount = await prisma.account.findFirst({ where: { code: "ACC-CASH" } });
  let defaultCashId = cashAccount?.id;
  if (!cashAccount) {
    const created = await prisma.account.create({
      data: { name: "Cash in Hand", code: "ACC-CASH", type: "asset", category: "cash", balance: 0, openingBalance: 0 },
    });
    defaultCashId = created.id;
  }

  const adminUser = await prisma.user.findFirst({ where: { email: ADMIN_EMAIL } });
  if (adminUser && defaultCashId) {
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { cashAccountId: defaultCashId },
    });
    await prisma.account.update({
      where: { id: defaultCashId },
      data: { ownerUserId: adminUser.id },
    });
  }

  const bankAccount = await prisma.account.findFirst({ where: { code: "ACC-BANK" } });
  if (!bankAccount) {
    await prisma.account.create({
      data: { name: "Main Bank Account", code: "ACC-BANK", type: "asset", category: "bank", balance: 0, openingBalance: 0 },
    });
  }

  const defaultCities = ["Lahore", "Karachi", "Islamabad", "Faisalabad", "Multan", "Okara", "Sahiwal"];
  for (const name of defaultCities) {
    await prisma.city.upsert({ where: { name }, update: {}, create: { name } });
  }

  console.log("Seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

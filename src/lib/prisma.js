import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { parseDatabaseUrl } from "@/lib/dbConfig";

function createPrismaClient() {
  const config = parseDatabaseUrl(process.env.DATABASE_URL);
  const adapter = new PrismaMariaDb(config);
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis;

function getPrismaClient() {
  if (!globalForPrisma.prismaGlobal) {
    globalForPrisma.prismaGlobal = createPrismaClient();
  }
  return globalForPrisma.prismaGlobal;
}

/** Interactive transaction defaults — stock/ledger flows can exceed Prisma's 5s default. */
export const PRISMA_TX_OPTIONS = {
  maxWait: 30_000,
  timeout: 30_000,
};

export async function runTransaction(callback) {
  return getPrismaClient().$transaction(callback, PRISMA_TX_OPTIONS);
}

/** Lazy client so `next build` does not require DATABASE_URL at import time (e.g. Vercel). */
const prisma = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getPrismaClient();
      const value = client[prop];
      return typeof value === "function" ? value.bind(client) : value;
    },
  }
);

export default prisma;

export async function checkDatabaseConnection() {
  await prisma.$queryRaw`SELECT 1`;
  return true;
}

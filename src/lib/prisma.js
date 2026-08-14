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

/** Drop cached client so the next query opens a fresh pool connection. */
export function resetPrismaClient() {
  const existing = globalForPrisma.prismaGlobal;
  globalForPrisma.prismaGlobal = undefined;
  if (existing?.$disconnect) {
    existing.$disconnect().catch(() => {});
  }
}

export function isTransientDbError(error) {
  const msg = String(error?.message || "");
  const code = error?.code;
  return (
    code === "ECONNRESET" ||
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "PROTOCOL_CONNECTION_LOST" ||
    /ECONNRESET|ECONNREFUSED|ETIMEDOUT|pool timeout|connection timeout|Connection lost|server has gone away|read ECONNRESET/i.test(msg)
  );
}

/** Retry DB work once after resetting a stale remote connection (Railway / proxy drops). */
export async function withDbRetry(fn, maxAttempts = 3) {
  let lastError;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await fn(getPrismaClient());
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts - 1 && isTransientDbError(error)) {
        resetPrismaClient();
        await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

/** Interactive transaction defaults — stock/ledger flows can exceed Prisma's 5s default. */
export const PRISMA_TX_OPTIONS = {
  maxWait: 30_000,
  timeout: 30_000,
};

export async function runTransaction(callback) {
  return withDbRetry((client) => client.$transaction(callback, PRISMA_TX_OPTIONS));
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
  await withDbRetry((client) => client.$queryRaw`SELECT 1`);
  return true;
}

export function dbUnavailableResponse(error) {
  const msg = String(error?.message || "");
  const remote = !/127\.0\.0\.1|localhost/i.test(process.env.DATABASE_URL || "");
  return Response.json(
    {
      error: remote
        ? "Database connection lost. Remote MySQL may have timed out — retry in a moment."
        : "Database connection lost. Check that MySQL is running, then retry.",
      code: error?.code || "DB_UNAVAILABLE",
    },
    { status: 503 }
  );
}

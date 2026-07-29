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

const prisma = globalForPrisma.prismaGlobal ?? createPrismaClient();

export default prisma;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaGlobal = prisma;
}

export async function checkDatabaseConnection() {
  await prisma.$queryRaw`SELECT 1`;
  return true;
}

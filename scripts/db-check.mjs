/** Verify DATABASE_URL connects (with TLS when required) before running db:push or the app. */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { parseDatabaseUrl } from "../src/lib/dbConfig.mjs";

async function main() {
  const config = parseDatabaseUrl(process.env.DATABASE_URL, { connectionLimit: 2, connectTimeout: 15_000 });
  console.log(
    `Checking ${config.host}:${config.port}/${config.database} (TLS ${config.ssl ? "on" : "off"}) ...`
  );
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(config) });
  try {
    const rows = await prisma.$queryRaw`SELECT VERSION() AS version`;
    console.log(`Database connection OK. Server: ${rows[0]?.version ?? "unknown"}`);
    process.exit(0);
  } catch (e) {
    console.error("Database connection FAILED:");
    console.error(e.message || e);
    console.error("\nCheck DATABASE_URL in .env (see .env.example). Hosted databases usually need ?sslaccept=strict.");
    process.exit(1);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main();

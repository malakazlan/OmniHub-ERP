require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaMariaDb } = require("@prisma/adapter-mariadb");

function parseDatabaseUrl(connectionString) {
  if (!connectionString?.trim()) {
    throw new Error("DATABASE_URL is missing in .env");
  }
  let raw = connectionString.trim().replace(/^["']|["']$/g, "");
  if (raw.startsWith("mysql://")) {
    raw = `mariadb://${raw.slice("mysql://".length)}`;
  }
  const url = new URL(raw);
  const database = url.pathname.replace(/^\//, "").split("?")[0];
  return {
    host: url.hostname === "localhost" ? "127.0.0.1" : url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username || "root"),
    password: decodeURIComponent(url.password || ""),
    database,
    connectTimeout: 15_000,
    connectionLimit: 5,
    prepareCacheLength: 0,
  };
}

async function main() {
  const config = parseDatabaseUrl(process.env.DATABASE_URL);
  console.log(`Checking MySQL at ${config.host}:${config.port} / ${config.database} ...`);
  const adapter = new PrismaMariaDb(config);
  const prisma = new PrismaClient({ adapter });
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("Database connection OK.");
    process.exit(0);
  } catch (e) {
    console.error("Database connection FAILED:");
    console.error(e.message || e);
    console.error("\nFix:");
    console.error("  1. Open XAMPP Control Panel → Start MySQL");
    console.error("  2. Create database metrofeeds_erp (phpMyAdmin) if missing");
    console.error("  3. Set DATABASE_URL in .env (see .env.example)");
    console.error("  4. Run: npm run db:setup");
    process.exit(1);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main();

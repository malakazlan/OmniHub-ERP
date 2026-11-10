/**
 * Verify DATABASE_URL connects (with TLS when required) before running
 * migrations or the app. Uses a single direct connection, not a pool, so the
 * underlying network error (ENOTFOUND, ECONNREFUSED, access denied) is shown
 * verbatim instead of a generic pool timeout.
 */
import "dotenv/config";
import mariadb from "mariadb";
import { parseDatabaseUrl } from "../src/lib/dbConfig.mjs";

async function main() {
  const config = parseDatabaseUrl(process.env.DATABASE_URL, { connectTimeout: 10_000 });
  console.log(`Checking ${config.host}:${config.port}/${config.database} (TLS ${config.ssl ? "on" : "off"}) ...`);
  let conn;
  try {
    conn = await mariadb.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      ssl: config.ssl,
      connectTimeout: config.connectTimeout,
    });
    const rows = await conn.query("SELECT VERSION() AS version");
    console.log(`Database connection OK. Server: ${rows[0]?.version ?? "unknown"}`);
    process.exit(0);
  } catch (e) {
    console.error("Database connection FAILED:");
    console.error(`${e.code ? `[${e.code}] ` : ""}${e.message || e}`);
    if (/ENOTFOUND|EAI_AGAIN/.test(String(e.code || e.message))) {
      console.error("The host name does not resolve from this container. The app and the database must share a Docker network.");
    } else if (/ECONNREFUSED/.test(String(e.code || e.message))) {
      console.error("The host resolved but nothing is listening on that port. Check the database is running and the port is 3306.");
    } else if (/access denied/i.test(String(e.message))) {
      console.error("Wrong user or password in DATABASE_URL.");
    }
    process.exit(1);
  } finally {
    await conn?.end().catch(() => {});
  }
}

main();

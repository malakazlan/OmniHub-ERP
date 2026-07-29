/**
 * Parse DATABASE_URL for @prisma/adapter-mariadb (object config avoids mysql:// pool issues).
 */
export function parseDatabaseUrl(connectionString) {
  if (!connectionString?.trim()) {
    throw new Error(
      "DATABASE_URL is missing. Copy .env.example to .env and set your MySQL connection."
    );
  }

  let raw = connectionString.trim().replace(/^["']|["']$/g, "");
  if (raw.startsWith("mysql://")) {
    raw = `mariadb://${raw.slice("mysql://".length)}`;
  } else if (!raw.startsWith("mariadb://")) {
    throw new Error("DATABASE_URL must start with mysql:// or mariadb://");
  }

  const url = new URL(raw);
  const database = url.pathname.replace(/^\//, "").split("?")[0];
  if (!database) {
    throw new Error("DATABASE_URL must include a database name (e.g. /metrofeeds_erp)");
  }

  const host = url.hostname === "localhost" ? "127.0.0.1" : url.hostname;

  return {
    host,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username || "root"),
    password: decodeURIComponent(url.password || ""),
    database,
    connectTimeout: 15_000,
    connectionLimit: 10,
    prepareCacheLength: 0,
  };
}

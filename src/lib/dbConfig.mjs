/**
 * Parse DATABASE_URL into a config object for @prisma/adapter-mariadb.
 *
 * Supported forms:
 *   mysql://user:pass@host:3306/dbname                 (plain, local MySQL/XAMPP)
 *   mysql://user:pass@host:4000/dbname?sslaccept=strict (TLS, certificate verified — TiDB Cloud, PlanetScale, Aiven)
 *   mysql://user:pass@host:3306/dbname?ssl=true         (TLS, certificate verified)
 *   mysql://user:pass@host:3306/dbname?ssl=false        (explicitly disable TLS)
 *
 * TLS defaults to ON for any non-local host and OFF for localhost / 127.0.0.1,
 * so a hosted database never silently falls back to plaintext.
 */
export function parseDatabaseUrl(connectionString, overrides = {}) {
  if (!connectionString?.trim()) {
    throw new Error(
      "DATABASE_URL is missing. Copy .env.example to .env and set your MySQL connection string."
    );
  }

  let raw = connectionString.trim().replace(/^["']|["']$/g, "");
  if (raw.startsWith("mysql://")) {
    raw = `mariadb://${raw.slice("mysql://".length)}`;
  } else if (!raw.startsWith("mariadb://")) {
    throw new Error("DATABASE_URL must start with mysql:// or mariadb://");
  }

  const url = new URL(raw);
  const database = url.pathname.replace(/^\//, "");
  if (!database) {
    throw new Error("DATABASE_URL must include a database name (e.g. /omnihub)");
  }

  const hostname = url.hostname;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  const host = hostname === "localhost" ? "127.0.0.1" : hostname;

  const sslParam = (url.searchParams.get("sslaccept") || url.searchParams.get("ssl") || "")
    .trim()
    .toLowerCase();
  let ssl;
  if (sslParam === "false" || sslParam === "0" || sslParam === "disable") {
    ssl = false;
  } else if (sslParam === "accept_invalid_certs") {
    ssl = { rejectUnauthorized: false };
  } else if (sslParam || !isLocal) {
    ssl = { rejectUnauthorized: true, minVersion: "TLSv1.2" };
  } else {
    ssl = false;
  }

  return {
    host,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username || "root"),
    password: decodeURIComponent(url.password || ""),
    database,
    ssl,
    // MySQL 8 defaults to caching_sha2_password. Over a plain connection the
    // client must fetch the server's RSA public key to send the password;
    // over TLS the key exchange is unnecessary and the option is ignored.
    allowPublicKeyRetrieval: !ssl,
    connectTimeout: 20_000,
    connectionLimit: 10,
    acquireTimeout: 20_000,
    idleTimeout: 30_000,
    minimumIdle: 1,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
    prepareCacheLength: 0,
    ...overrides,
  };
}

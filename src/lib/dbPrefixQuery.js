import prisma from "./prisma";

/** Collation-safe prefix lookup for MySQL hosts with mixed table collations (e.g. Hostinger). */
const MYSQL_COLLATION = "utf8mb4_unicode_ci";

export async function findLatestByPrefix(table, column, prefix, db = prisma) {
  const rows = await db.$queryRawUnsafe(
    `SELECT \`${column}\` AS value FROM \`${table}\` WHERE \`${column}\` IS NOT NULL AND \`${column}\` COLLATE ${MYSQL_COLLATION} LIKE ? ORDER BY \`${column}\` DESC LIMIT 1`,
    `${prefix}%`
  );
  return rows[0]?.value ?? null;
}

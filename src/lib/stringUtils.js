/** Trim string fields; empty string becomes null (for optional DB columns). */
export function trimOrNull(value) {
  if (value == null) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed || null;
}

import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "metrofeeds_erp_secret_key_jwt_2026";

function getSecretKey() {
  return new TextEncoder().encode(JWT_SECRET);
}

/** Verify session JWT (Edge + Node). Returns payload or null. */
export async function verifySessionToken(token) {
  if (!token || typeof token !== "string") return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload;
  } catch {
    return null;
  }
}

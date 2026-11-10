import { jwtVerify } from "jose";

/** Session cookie name. Kept edge-safe (no Node-only imports) so proxy.js can use it. */
export const AUTH_COOKIE_NAME = "omnihub_session";

/** Session lifetime in seconds (12 hours). Short on purpose: role or deactivation changes take effect quickly. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

/**
 * Secret used to sign and verify session tokens. There is intentionally no
 * fallback: a predictable default would let anyone forge an admin session.
 */
export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET is missing or shorter than 32 characters. Set it in .env (see .env.example).");
  }
  return secret;
}

function getSecretKey() {
  return new TextEncoder().encode(getJwtSecret());
}

/** Verify session JWT (Edge + Node). Returns payload or null. */
export async function verifySessionToken(token) {
  if (!token || typeof token !== "string") return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ["HS256"] });
    return payload;
  } catch {
    return null;
  }
}

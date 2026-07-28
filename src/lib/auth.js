import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "metrofeeds_erp_secret_key_jwt_2026";

export const AUTH_COOKIE_NAME = "metrofeeds_token";

export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/** Parse Cookie header; values may contain '=' (e.g. JWT). */
export function parseCookieHeader(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  for (const segment of cookieHeader.split(";")) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const name = trimmed.slice(0, eq);
    const raw = trimmed.slice(eq + 1);
    try {
      cookies[name] = decodeURIComponent(raw);
    } catch {
      cookies[name] = raw;
    }
  }
  return cookies;
}

export function getUserFromRequest(req) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const cookies = parseCookieHeader(cookieHeader);
    const token = cookies[AUTH_COOKIE_NAME];
    if (!token) return null;

    return verifyToken(token);
  } catch (err) {
    return null;
  }
}

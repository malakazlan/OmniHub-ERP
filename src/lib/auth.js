import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";
import { AUTH_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, getJwtSecret } from "@/lib/sessionToken";

export { AUTH_COOKIE_NAME, SESSION_MAX_AGE_SECONDS };

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function comparePassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

export function signToken(payload) {
  return jwt.sign(payload, getJwtSecret(), {
    algorithm: "HS256",
    expiresIn: SESSION_MAX_AGE_SECONDS,
  });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] });
  } catch {
    return null;
  }
}

/** Cookie attributes shared by login (set) and logout / proxy (clear). */
export function sessionCookieOptions(maxAge = SESSION_MAX_AGE_SECONDS) {
  return {
    name: AUTH_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  };
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

/** Decode the session token from the request without touching the database. */
export function getTokenPayloadFromRequest(req) {
  try {
    const cookies = parseCookieHeader(req.headers.get("cookie") || "");
    const token = cookies[AUTH_COOKIE_NAME];
    return token ? verifyToken(token) : null;
  } catch {
    return null;
  }
}

const SESSION_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  cashAccountId: true,
  allowedModules: true,
};

function parseModules(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Resolve the authenticated user for an API request.
 *
 * The token proves who signed in; the database decides what they may do now.
 * Role, module access, cash account and active flag are read fresh on every
 * request, so deactivating or demoting a user takes effect immediately rather
 * than when their token expires.
 *
 * Returns null when there is no valid session or the user is inactive.
 * The returned object keeps the historical `userId` field that route handlers
 * and the activity log rely on, and also exposes `id`.
 */
export async function getUserFromRequest(req) {
  const payload = getTokenPayloadFromRequest(req);
  const userId = Number(payload?.userId);
  if (!Number.isInteger(userId) || userId <= 0) return null;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: SESSION_USER_SELECT });
  if (!user || !user.isActive) return null;

  return {
    userId: user.id,
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    cashAccountId: user.cashAccountId ?? null,
    allowedModules: parseModules(user.allowedModules),
  };
}

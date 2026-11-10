import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { comparePassword, signToken, sessionCookieOptions } from "@/lib/auth";
import { serializeAuthUser } from "@/lib/sessionUser";
import { logActivity } from "@/lib/activityLog";
import { isTransientDbError } from "@/lib/prisma";

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  avatar: true,
  phone: true,
  cashAccountId: true,
  allowedModules: true,
  password: true,
  isActive: true,
};

const INVALID = { error: "Invalid email or password." };

let dummyHash = null;
function getDummyHash() {
  if (!dummyHash) dummyHash = bcrypt.hashSync("omnihub-timing-equalizer", 12);
  return dummyHash;
}

/**
 * Simple in-memory throttle: after 5 failed attempts for an email within 15
 * minutes, reject for the remainder of the window. Per server instance, which
 * is enough to blunt online guessing without a shared store.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const failures = new Map();

function isThrottled(email) {
  const entry = failures.get(email);
  if (!entry) return false;
  if (Date.now() - entry.first > WINDOW_MS) {
    failures.delete(email);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

function recordFailure(email) {
  const entry = failures.get(email);
  if (!entry || Date.now() - entry.first > WINDOW_MS) {
    failures.set(email, { first: Date.now(), count: 1 });
  } else {
    entry.count += 1;
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    if (isThrottled(email)) {
      return NextResponse.json(
        { error: "Too many failed sign-in attempts. Try again in a few minutes." },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email }, select: USER_SELECT });

    // Compare against a real hash even when the user is unknown so timing is uniform.
    const passwordMatch = await comparePassword(password, user ? user.password : getDummyHash());

    if (!user || !user.isActive || !passwordMatch) {
      recordFailure(email);
      return NextResponse.json(INVALID, { status: 401 });
    }

    failures.delete(email);

    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

    const token = signToken({ userId: user.id });

    const response = NextResponse.json({ message: "Login successful.", user: serializeAuthUser(user) });
    response.cookies.set({ ...sessionCookieOptions(), value: token });

    logActivity({ userId: user.id, action: "LOGIN", module: "auth", req: request }).catch(() => {});

    return response;
  } catch (error) {
    console.error("Login API error:", error);
    if (isTransientDbError(error) || /DATABASE_URL/i.test(String(error?.message))) {
      return NextResponse.json({ error: "The database is unavailable. Please try again shortly." }, { status: 503 });
    }
    return NextResponse.json({ error: "Internal server error during login." }, { status: 500 });
  }
}

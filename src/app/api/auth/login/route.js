import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { comparePassword, signToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { serializeAuthUser } from "@/lib/sessionUser";
import { logActivity } from "@/lib/activityLog";

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

export async function POST(request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: USER_SELECT,
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const passwordMatch = await comparePassword(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const safeUser = serializeAuthUser(user);
    const allowedModules = safeUser.allowedModules;

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      cashAccountId: user.cashAccountId ?? null,
      allowedModules,
    });

    const response = NextResponse.json({
      message: "Login successful.",
      user: safeUser,
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    logActivity({ userId: user.id, action: "LOGIN", module: "auth", req: request }).catch(
      () => {}
    );

    return response;
  } catch (error) {
    console.error("Login API error:", error);
    const msg = String(error?.message || "");
    const dbDown =
      error?.code === "P2039" ||
      /pool timeout|connection timeout|ECONNREFUSED|DATABASE_URL/i.test(msg);
    if (dbDown) {
      return NextResponse.json(
        {
          error:
            "Cannot reach the database. Start MySQL in XAMPP, then run: npm run db:setup",
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error during login." },
      { status: 500 }
    );
  }
}

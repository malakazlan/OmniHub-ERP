import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { serializeAuthUser } from "@/lib/sessionUser";

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  avatar: true,
  phone: true,
  cashAccountId: true,
  allowedModules: true,
  isActive: true,
};

export async function GET(request) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload?.userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: USER_SELECT,
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "User not found or disabled." },
        { status: 401 }
      );
    }

    return NextResponse.json({ user: serializeAuthUser(user) });
  } catch (error) {
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getUserFromRequest, AUTH_COOKIE_NAME } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";

export async function POST(request) {
  const user = getUserFromRequest(request);
  if (user) {
    logActivity({ userId: user.userId, action: "LOGOUT", module: "auth", req: request });
  }

  const response = NextResponse.json({
    message: "Logged out successfully.",
  });

  // Clear the cookie by setting maxAge to 0
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}

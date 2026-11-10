import { NextResponse } from "next/server";
import { getUserFromRequest, sessionCookieOptions } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";

export async function POST(request) {
  const user = await getUserFromRequest(request).catch(() => null);
  if (user) {
    await logActivity({ userId: user.userId, action: "LOGOUT", module: "auth", req: request }).catch(() => {});
  }

  const response = NextResponse.json({ message: "Logged out successfully." });
  response.cookies.set({ ...sessionCookieOptions(0), value: "" });
  return response;
}

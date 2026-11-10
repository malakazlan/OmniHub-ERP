import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/sessionToken";

/**
 * Page-level session gate. API routes are excluded by the matcher and enforce
 * auth themselves via getUserFromRequest (which also re-checks the database).
 */
const PUBLIC_PATHS = new Set(["/", "/login"]);

function clearAuthCookie(response) {
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

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isPublic = PUBLIC_PATHS.has(pathname);

  if (!token) {
    if (isPublic) return NextResponse.next();
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/dashboard") loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = await verifySessionToken(token);

  if (!payload) {
    if (isPublic) return clearAuthCookie(NextResponse.next());
    return clearAuthCookie(NextResponse.redirect(new URL("/login", request.url)));
  }

  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|design|.*\\..*).*)"],
};

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { AUTH_COOKIE_NAME, isAuthConfigured, verifySessionToken } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/api/auth/login") {
    return NextResponse.next();
  }

  if (pathname === "/login") {
    if (isAuthConfigured()) {
      const session = request.cookies.get(AUTH_COOKIE_NAME)?.value;
      const isAuthenticated = Boolean(
        session && (await verifySessionToken(session)),
      );
      if (isAuthenticated) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
    return NextResponse.next();
  }

  if (!isAuthConfigured()) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const session = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isAuthenticated = Boolean(session && (await verifySessionToken(session)));

  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

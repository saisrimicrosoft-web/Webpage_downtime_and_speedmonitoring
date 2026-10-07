import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const publicRoutes = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

const authApiRoutes = ["/api/auth"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Allow Auth.js API routes to pass through
  if (authApiRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow public API routes (registration, forgot-password, etc.)
  if (pathname.startsWith("/api/register") ||
      pathname.startsWith("/api/verify-email") ||
      pathname.startsWith("/api/forgot-password") ||
      pathname.startsWith("/api/reset-password")) {
    return NextResponse.next();
  }

  // Flask proxy routes — let them pass through
  // These are handled by next.config.ts rewrites
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Public pages: redirect authenticated users to dashboard
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }
    return NextResponse.next();
  }

  // Protected pages: redirect unauthenticated users to login
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Match all routes except static files and _next
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

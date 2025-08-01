import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/rate-limit";

export async function middleware(request: NextRequest) {
  // Apply rate limiting to API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    // Skip rate limiting for auth endpoints (they have their own)
    if (!request.nextUrl.pathname.startsWith("/api/auth/")) {
      const rateLimitResponse = await withRateLimit(request, 'api');
      if (rateLimitResponse) {
        return rateLimitResponse;
      }
    }
  }

  const token = request.cookies.get('__Secure-next-auth.session-token') || request.cookies.get('next-auth.session-token');

  const isAuthPage = request.nextUrl.pathname.startsWith("/login") || request.nextUrl.pathname.startsWith("/register");

  if (isAuthPage) {
    if (token) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return null;
  }

  // Protected routes
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    if (!token) {
      let from = request.nextUrl.pathname;
      if (request.nextUrl.search) {
        from += request.nextUrl.search;
      }

      return NextResponse.redirect(
        new URL(`/login?from=${encodeURIComponent(from)}`, request.url)
      );
    }
  }

  return null;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/register",
    "/api/:path*"
  ],
};
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { rateLimit } from "@/lib/ratelimit";

/* Public paths that never require auth */
const PUBLIC = ["/login", "/api/auth", "/api/v1", "/api/upload"];

function getIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getIP(request);

  /* ── Rate limit /api/v1 — 120 req/min per IP ───────────── */
  if (pathname.startsWith("/api/v1")) {
    const { allowed, remaining, resetAt } = rateLimit(`api:${ip}`, 120, 60_000);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: {
            "Retry-After":       String(Math.ceil((resetAt - Date.now()) / 1000)),
            "X-RateLimit-Limit": "120",
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }
    const res = NextResponse.next();
    res.headers.set("X-RateLimit-Limit",     "120");
    res.headers.set("X-RateLimit-Remaining", String(remaining));
    return res;
  }

  /* ── Rate limit /api/auth — 20 req/min per IP ──────────── */
  if (pathname.startsWith("/api/auth")) {
    const { allowed } = rateLimit(`auth:${ip}`, 20, 60_000);
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  }

  const isPublic = PUBLIC.some((p) => pathname.startsWith(p));

  const token = await getToken({
    req:    request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  /* Unauthenticated → redirect to /login */
  if (!token && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  /* Authenticated + hitting /login → redirect to dashboard */
  if (token && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};

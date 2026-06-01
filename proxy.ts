import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { rateLimit } from "@/lib/ratelimit";

/* Public paths that never require auth */
const PUBLIC = ["/login", "/api/auth", "/api/v1", "/api/upload", "/api/forms", "/api/sse"];

/* Private API routes that return 401 (not redirect) when unauthenticated */
const PRIVATE_API = ["/api/upload", "/api/media/transform"];

/* Routes with their rate limits */
const RATE_LIMITS: Array<{ prefix: string; key: string; limit: number; window: number }> = [
  { prefix: "/api/v1",             key: "api",       limit: 120, window: 60_000 },
  { prefix: "/api/auth",           key: "auth",      limit: 20,  window: 60_000 },
  { prefix: "/api/forms",          key: "forms",     limit: 10,  window: 60_000 },
  { prefix: "/api/upload",         key: "upload",    limit: 20,  window: 60_000 },
  { prefix: "/api/media/transform",key: "transform", limit: 60,  window: 60_000 },
];

function getIP(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown";
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip            = getIP(request);
  const allowedOrigin = process.env.CORS_ORIGIN ?? request.headers.get("origin") ?? "*";

  /* ── CORS preflight ─────────────────────────────────────── */
  if (request.method === "OPTIONS" && pathname.startsWith("/api/")) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin":  allowedOrigin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Api-Key",
        "Access-Control-Max-Age":       "86400",
      },
    });
  }

  /* ── Rate limiting ───────────────────────────────────────── */
  for (const rl of RATE_LIMITS) {
    if (pathname.startsWith(rl.prefix)) {
      const { allowed, resetAt } = rateLimit(`${rl.key}:${ip}`, rl.limit, rl.window);
      if (!allowed) {
        return NextResponse.json(
          { error: "Too many requests" },
          {
            status: 429,
            headers: {
              "Retry-After":           String(Math.ceil((resetAt - Date.now()) / 1000)),
              "X-RateLimit-Limit":     String(rl.limit),
              "X-RateLimit-Remaining": "0",
            },
          }
        );
      }
      break;
    }
  }

  /* ── Auth ────────────────────────────────────────────────── */
  const isPublic = PUBLIC.some((p) => pathname.startsWith(p));
  const isSite   = pathname.startsWith("/site");

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  /* Private API → 401, not a redirect */
  if (!token && PRIVATE_API.some((p) => pathname.startsWith(p))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /* Dashboard pages → redirect to /login */
  if (!token && !isPublic && !isSite && pathname.startsWith("/api/") === false) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  /* Authenticated on /login → redirect to dashboard */
  if (token && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  /* ── CORS headers on all API responses ───────────────────── */
  const res = NextResponse.next();
  if (pathname.startsWith("/api/")) {
    res.headers.set("Access-Control-Allow-Origin",  allowedOrigin);
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Api-Key");
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads).*)"],
};

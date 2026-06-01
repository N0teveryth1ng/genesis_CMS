import { db } from "@/lib/db";
import { redis, hasRedis } from "@/lib/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const checks: Record<string, "ok" | "error"> = {};
  let healthy = true;

  /* Database */
  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
    healthy = false;
  }

  /* Redis (optional) */
  if (hasRedis() && redis) {
    try {
      await redis.ping();
      checks.redis = "ok";
    } catch {
      checks.redis = "error";
      /* Redis failure is a warning, not a hard outage */
    }
  }

  checks.storage = process.env.STORAGE_PROVIDER === "s3"
    ? (process.env.AWS_BUCKET ? "ok" : "error")
    : "ok";

  return Response.json(
    { status: healthy ? "healthy" : "degraded", checks, ts: new Date().toISOString() },
    { status: healthy ? 200 : 503 }
  );
}

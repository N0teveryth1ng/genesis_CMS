import { createYoga, createSchema } from "graphql-yoga";
import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { buildDynamicSchema } from "@/lib/graphql/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ── Auth ────────────────────────────────────────────────── */
async function authenticate(req: Request): Promise<boolean> {
  const auth = req.headers.get("authorization") ?? "";
  const raw  = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!raw) return false;

  const keyHash = createHash("sha256").update(raw).digest("hex");
  const key = await db.apiKey.findUnique({ where: { keyHash } });
  if (!key || !key.active) return false;

  db.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  return true;
}

/* ── Handler ─────────────────────────────────────────────── */
async function makeHandler(req: Request) {
  const authed = await authenticate(req);

  if (!authed) {
    return new Response(JSON.stringify({ errors: [{ message: "Unauthorized" }] }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { typeDefs, resolvers } = await buildDynamicSchema();

  const schema = createSchema({
    typeDefs,
    resolvers: {
      Query:    resolvers.Query    as Record<string, unknown>,
      Mutation: resolvers.Mutation as Record<string, unknown>,
    },
  });

  const yoga = createYoga({
    schema,
    graphqlEndpoint: "/api/graphql",
    cors: {
      origin: "*",
      allowedHeaders: ["Authorization", "Content-Type"],
      methods: ["GET", "POST", "OPTIONS"],
    },
    landingPage: false,
  });

  return yoga.fetch(req);
}

export async function GET(req: NextRequest)  { return makeHandler(req); }
export async function POST(req: NextRequest) { return makeHandler(req); }

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin":  "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { fireWebhooks } from "@/lib/actions/webhooks";
import {
  queryDynamicRows,
  insertDynamicRow,
  getDynamicRow,
} from "@/lib/db-dynamic";

export const runtime = "nodejs";

/* ── CORS ────────────────────────────────────────────────── */
const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

/* ── Auth helper ─────────────────────────────────────────── */
async function authenticate(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const raw  = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!raw) return null;

  const keyHash = createHash("sha256").update(raw).digest("hex");
  const key = await db.apiKey.findUnique({ where: { keyHash } });
  if (!key || !key.active) return null;

  db.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  return key;
}

function notAuth() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
function forbidden() {
  return NextResponse.json({ error: "This key does not have write permissions" }, { status: 403 });
}

/* ── GET /api/v1/[collection] — list records ─────────────── */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  const key = await authenticate(req);
  if (!key) return notAuth();

  const { collection: collectionName } = await params;
  const populate = new URL(req.url).searchParams.get("populate") === "true";

  const col = await db.collection.findUnique({
    where:   { name: collectionName },
    include: { fields: true },
  });
  if (!col) return NextResponse.json({ error: "Collection not found" }, { status: 404 });

  const url   = new URL(req.url);
  const page  = Math.max(1, parseInt(url.searchParams.get("page")  ?? "1",  10));
  const limit = Math.min(100, parseInt(url.searchParams.get("limit") ?? "50", 10));

  // Dynamic table path
  if (col.tableName) {
    const { records, total } = await queryDynamicRows(col.tableName, col.id, page, limit);

    const data = await Promise.all(records.map(async (r) => {
      let parsed: Record<string, unknown> = {};
      try { parsed = JSON.parse(r.data); } catch { /* empty */ }

      if (populate) {
        const relationFields = col.fields.filter((f) => f.type === "relation");
        for (const f of relationFields) {
          const val = parsed[f.name];
          if (!val) continue;
          try {
            const ids = Array.isArray(val) ? val as string[] : [val as string];
            const related = await db.record.findMany({ where: { id: { in: ids } } });
            parsed[f.name] = related.map((rr) => {
              let d: Record<string, unknown> = {};
              try { d = JSON.parse(rr.data); } catch { /* empty */ }
              return { id: rr.id, ...d };
            });
          } catch { /* skip */ }
        }
      }

      return { id: r.id, ...parsed, createdAt: r.createdAt, updatedAt: r.updatedAt };
    }));

    return NextResponse.json(
      { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } },
      { headers: CORS },
    );
  }

  // Legacy JSON blob path
  const [records, total] = await Promise.all([
    db.record.findMany({
      where:   { collectionId: col.id },
      orderBy: { createdAt: "desc" },
      skip:    (page - 1) * limit,
      take:    limit,
    }),
    db.record.count({ where: { collectionId: col.id } }),
  ]);

  const relationFields = col.fields.filter((f) => f.type === "relation");

  const data = await Promise.all(records.map(async (r) => {
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(r.data); } catch { /* empty */ }

    if (populate && relationFields.length > 0) {
      for (const f of relationFields) {
        const val = parsed[f.name];
        if (!val) continue;
        try {
          const ids = Array.isArray(val) ? val as string[] : [val as string];
          const related = await db.record.findMany({ where: { id: { in: ids } } });
          parsed[f.name] = related.map((rr) => {
            let d: Record<string, unknown> = {};
            try { d = JSON.parse(rr.data); } catch { /* empty */ }
            return { id: rr.id, ...d };
          });
        } catch { /* skip */ }
      }
    }

    return { id: r.id, ...parsed, createdAt: r.createdAt, updatedAt: r.updatedAt };
  }));

  return NextResponse.json(
    { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } },
    { headers: CORS },
  );
}

/* ── POST /api/v1/[collection] — create record ───────────── */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  const key = await authenticate(req);
  if (!key) return notAuth();
  if (key.permissions !== "read_write") return forbidden();

  const { collection: collectionName } = await params;
  const col = await db.collection.findUnique({
    where:   { name: collectionName },
    include: { fields: true },
  });
  if (!col) return NextResponse.json({ error: "Collection not found" }, { status: 404 });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Required field validation
  for (const f of col.fields) {
    if (f.required && (body[f.name] === undefined || body[f.name] === null || body[f.name] === "")) {
      return NextResponse.json({ error: `Field "${f.name}" is required` }, { status: 422 });
    }
  }

  if (col.tableName) {
    const record = await insertDynamicRow(col.tableName, col.id, body);
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(record.data); } catch { /* empty */ }
    fireWebhooks("record.create", col.id, col.name, { id: record.id, ...body }).catch(() => {});
    return NextResponse.json(
      { data: { id: record.id, ...parsed, createdAt: record.createdAt, updatedAt: record.updatedAt } },
      { status: 201, headers: CORS },
    );
  }

  // Legacy JSON blob path
  const record = await db.record.create({
    data: { collectionId: col.id, data: JSON.stringify(body) },
  });

  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(record.data); } catch { /* empty */ }

  fireWebhooks("record.create", col.id, col.name, { id: record.id, ...body }).catch(() => {});
  return NextResponse.json(
    { data: { id: record.id, ...parsed, createdAt: record.createdAt, updatedAt: record.updatedAt } },
    { status: 201, headers: CORS },
  );
}

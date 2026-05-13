import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { fireWebhooks } from "@/lib/actions/webhooks";

export const runtime = "nodejs";

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

type RouteParams = { params: Promise<{ collection: string; id: string }> };

/* ── GET /api/v1/[collection]/[id] ──────────────────────── */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const key = await authenticate(req);
  if (!key) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { collection: collectionName, id } = await params;
  const col = await db.collection.findUnique({ where: { name: collectionName } });
  if (!col) return NextResponse.json({ error: "Collection not found" }, { status: 404 });

  const record = await db.record.findFirst({ where: { id, collectionId: col.id } });
  if (!record)  return NextResponse.json({ error: "Record not found" }, { status: 404 });

  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(record.data); } catch { /* empty */ }

  return NextResponse.json({ data: { id: record.id, ...parsed, createdAt: record.createdAt, updatedAt: record.updatedAt } });
}

/* ── PATCH /api/v1/[collection]/[id] ────────────────────── */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const key = await authenticate(req);
  if (!key) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (key.permissions !== "read_write") return NextResponse.json({ error: "Write permission required" }, { status: 403 });

  const { collection: collectionName, id } = await params;
  const col = await db.collection.findUnique({ where: { name: collectionName } });
  if (!col) return NextResponse.json({ error: "Collection not found" }, { status: 404 });

  const record = await db.record.findFirst({ where: { id, collectionId: col.id } });
  if (!record)  return NextResponse.json({ error: "Record not found" }, { status: 404 });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let existing: Record<string, unknown> = {};
  try { existing = JSON.parse(record.data); } catch { /* empty */ }

  const merged = { ...existing, ...body };
  const updated = await db.record.update({ where: { id }, data: { data: JSON.stringify(merged) } });

  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(updated.data); } catch { /* empty */ }

  fireWebhooks("record.update", col.id, col.name, { id: updated.id, ...parsed }).catch(() => {});
  return NextResponse.json({ data: { id: updated.id, ...parsed, createdAt: updated.createdAt, updatedAt: updated.updatedAt } });
}

/* ── DELETE /api/v1/[collection]/[id] ───────────────────── */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const key = await authenticate(req);
  if (!key) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (key.permissions !== "read_write") return NextResponse.json({ error: "Write permission required" }, { status: 403 });

  const { collection: collectionName, id } = await params;
  const col = await db.collection.findUnique({ where: { name: collectionName } });
  if (!col) return NextResponse.json({ error: "Collection not found" }, { status: 404 });

  const record = await db.record.findFirst({ where: { id, collectionId: col.id } });
  if (!record)  return NextResponse.json({ error: "Record not found" }, { status: 404 });

  await db.record.delete({ where: { id } });
  fireWebhooks("record.delete", col.id, col.name, { id }).catch(() => {});
  return NextResponse.json({ data: { id } });
}

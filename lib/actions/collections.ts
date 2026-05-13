"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { fireWebhooks } from "./webhooks";
import { logAudit } from "./audit";

/* ── Collections ─────────────────────────────────────────── */

export async function getCollections() {
  return db.collection.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { fields: true } } },
  });
}

export async function getCollection(id: string) {
  return db.collection.findUnique({
    where: { id },
    include: { fields: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function createCollection(formData: FormData) {
  const label       = String(formData.get("label") ?? "").trim();
  const icon        = String(formData.get("icon")  ?? "Database");
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!label) throw new Error("Label is required");

  const name = slugify(label);
  if (!name)  throw new Error("Could not generate a valid name from label");

  const existing = await db.collection.findUnique({ where: { name } });
  if (existing)  throw new Error(`Collection "${name}" already exists`);

  const collection = await db.collection.create({
    data: { name, label, icon, description },
  });

  revalidatePath("/collections");
  logAudit("create", "collection", collection.id, { name: collection.name, label: collection.label }).catch(() => {});
  return { ok: true, collection };
}

export async function updateCollection(id: string, formData: FormData) {
  const label       = String(formData.get("label") ?? "").trim();
  const icon        = String(formData.get("icon")  ?? "Database");
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!label) throw new Error("Label is required");

  const collection = await db.collection.update({
    where: { id },
    data:  { label, icon, description },
  });

  revalidatePath("/collections");
  revalidatePath(`/collections/${id}`);
  return { ok: true, collection };
}

export async function deleteCollection(id: string) {
  const col = await db.collection.findUnique({ where: { id } });
  await db.collection.delete({ where: { id } });
  revalidatePath("/collections");
  if (col) logAudit("delete", "collection", id, { name: col.name, label: col.label }).catch(() => {});
  return { ok: true };
}

/* ── Fields ──────────────────────────────────────────────── */

export async function createField(collectionId: string, formData: FormData) {
  const label        = String(formData.get("label")        ?? "").trim();
  const type         = String(formData.get("type")         ?? "text");
  const required     = formData.get("required")  === "true";
  const unique       = formData.get("unique")    === "true";
  const hidden       = formData.get("hidden")    === "true";
  const defaultValue = String(formData.get("defaultValue") ?? "").trim() || null;
  const options      = String(formData.get("options")      ?? "").trim() || null;

  if (!label) throw new Error("Label is required");

  const name = slugify(label);
  if (!name)  throw new Error("Could not generate a valid name from label");

  const count = await db.field.count({ where: { collectionId } });

  const field = await db.field.create({
    data: {
      collectionId,
      name, label, type,
      required, unique, hidden,
      defaultValue, options,
      sortOrder: count,
    },
  });

  revalidatePath(`/collections/${collectionId}`);
  return { ok: true, field };
}

export async function updateField(fieldId: string, collectionId: string, formData: FormData) {
  const label        = String(formData.get("label")        ?? "").trim();
  const type         = String(formData.get("type")         ?? "text");
  const required     = formData.get("required")  === "true";
  const unique       = formData.get("unique")    === "true";
  const hidden       = formData.get("hidden")    === "true";
  const defaultValue = String(formData.get("defaultValue") ?? "").trim() || null;
  const options      = String(formData.get("options")      ?? "").trim() || null;

  if (!label) throw new Error("Label is required");

  const field = await db.field.update({
    where: { id: fieldId },
    data:  { label, type, required, unique, hidden, defaultValue, options },
  });

  revalidatePath(`/collections/${collectionId}`);
  return { ok: true, field };
}

export async function deleteField(fieldId: string, collectionId: string) {
  await db.field.delete({ where: { id: fieldId } });
  revalidatePath(`/collections/${collectionId}`);
  return { ok: true };
}

export async function reorderFields(collectionId: string, orderedIds: string[]) {
  await Promise.all(
    orderedIds.map((id, i) =>
      db.field.update({ where: { id }, data: { sortOrder: i } })
    )
  );
  revalidatePath(`/collections/${collectionId}`);
  return { ok: true };
}

/* ── Records ─────────────────────────────────────────────── */

export async function getRecords(collectionId: string, page = 1, pageSize = 50) {
  const [records, total] = await Promise.all([
    db.record.findMany({
      where:   { collectionId },
      orderBy: { createdAt: "desc" },
      skip:    (page - 1) * pageSize,
      take:    pageSize,
    }),
    db.record.count({ where: { collectionId } }),
  ]);
  return { records, total, page, pageSize };
}

export async function createRecord(collectionId: string, data: Record<string, unknown>) {
  const col = await db.collection.findUnique({ where: { id: collectionId } });
  const record = await db.record.create({
    data: { collectionId, data: JSON.stringify(data) },
  });
  revalidatePath(`/collections/${collectionId}/data`);
  if (col) {
    fireWebhooks("record.create", collectionId, col.name, { id: record.id, ...data }).catch(() => {});
    logAudit("create", "record", record.id, { collectionName: col.name }).catch(() => {});
  }
  return { ok: true, record };
}

export async function updateRecord(recordId: string, collectionId: string, data: Record<string, unknown>) {
  const col = await db.collection.findUnique({ where: { id: collectionId } });
  const record = await db.record.update({
    where: { id: recordId },
    data:  { data: JSON.stringify(data) },
  });
  revalidatePath(`/collections/${collectionId}/data`);
  if (col) {
    fireWebhooks("record.update", collectionId, col.name, { id: recordId, ...data }).catch(() => {});
    logAudit("update", "record", recordId, { collectionName: col.name }).catch(() => {});
  }
  return { ok: true, record };
}

export async function deleteRecord(recordId: string, collectionId: string) {
  const col = await db.collection.findUnique({ where: { id: collectionId } });
  await db.record.delete({ where: { id: recordId } });
  revalidatePath(`/collections/${collectionId}/data`);
  if (col) {
    fireWebhooks("record.delete", collectionId, col.name, { id: recordId }).catch(() => {});
    logAudit("delete", "record", recordId, { collectionName: col.name }).catch(() => {});
  }
  return { ok: true };
}

export async function getRecordLabels(collectionId: string) {
  const [fields, records] = await Promise.all([
    db.field.findMany({ where: { collectionId }, orderBy: { sortOrder: "asc" } }),
    db.record.findMany({ where: { collectionId }, orderBy: { createdAt: "desc" }, take: 200 }),
  ]);
  const firstTextField = fields.find((f) => f.type === "text" || f.type === "textarea" || f.type === "email");
  return records.map((r) => {
    let data: Record<string, unknown> = {};
    try { data = JSON.parse(r.data); } catch { /* empty */ }
    const label = firstTextField ? String(data[firstTextField.name] ?? "") : "";
    return { id: r.id, label: label || r.id.slice(0, 8) };
  });
}

export async function getCollectionStats() {
  const [collections, records, users] = await Promise.all([
    db.collection.count(),
    db.record.count(),
    db.user.count(),
  ]);
  return { collections, records, users };
}

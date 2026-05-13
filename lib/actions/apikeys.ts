"use server";

import { revalidatePath } from "next/cache";
import { randomBytes, createHash } from "crypto";
import { db } from "@/lib/db";

function hashKey(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

export async function getApiKeys() {
  return db.apiKey.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createApiKey(formData: FormData) {
  const name        = String(formData.get("name")        ?? "").trim();
  const permissions = String(formData.get("permissions") ?? "read");

  if (!name) throw new Error("Name is required");
  if (!["read", "read_write"].includes(permissions)) throw new Error("Invalid permissions");

  const raw    = `gen_${permissions === "read_write" ? "rw" : "ro"}_${randomBytes(24).toString("hex")}`;
  const prefix = raw.slice(0, 14);

  await db.apiKey.create({
    data: { name, keyHash: hashKey(raw), prefix, permissions },
  });

  revalidatePath("/api-keys");
  return { ok: true, key: raw }; // returned once — never stored in plain text
}

export async function revokeApiKey(id: string) {
  await db.apiKey.delete({ where: { id } });
  revalidatePath("/api-keys");
  return { ok: true };
}

/* Used by the REST API middleware */
export async function validateApiKey(raw: string) {
  const key = await db.apiKey.findUnique({
    where: { keyHash: hashKey(raw) },
  });
  if (!key || !key.active) return null;
  // fire-and-forget lastUsed update
  db.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  return key;
}

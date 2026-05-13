"use server";

import { revalidatePath } from "next/cache";
import { createHmac } from "crypto";
import { db } from "@/lib/db";
import { logAudit } from "./audit";

export type WebhookEvent = "record.create" | "record.update" | "record.delete";

export async function getWebhooks() {
  return db.webhook.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createWebhook(formData: FormData) {
  const name         = String(formData.get("name")         ?? "").trim();
  const url          = String(formData.get("url")          ?? "").trim();
  const secret       = String(formData.get("secret")       ?? "").trim() || null;
  const collectionId = String(formData.get("collectionId") ?? "").trim() || null;
  const events       = formData.getAll("events") as string[];

  if (!name) throw new Error("Name is required");
  if (!url)  throw new Error("URL is required");
  if (!events.length) throw new Error("Select at least one event");

  const hook = await db.webhook.create({
    data: { name, url, secret, collectionId, events: JSON.stringify(events) },
  });

  logAudit("create", "webhook", hook.id, { name, url }).catch(() => {});
  revalidatePath("/webhooks");
  return { ok: true };
}

export async function toggleWebhook(id: string, active: boolean) {
  await db.webhook.update({ where: { id }, data: { active } });
  revalidatePath("/webhooks");
  return { ok: true };
}

export async function deleteWebhook(id: string) {
  const hook = await db.webhook.findUnique({ where: { id } });
  await db.webhook.delete({ where: { id } });
  logAudit("delete", "webhook", id, { name: hook?.name }).catch(() => {});
  revalidatePath("/webhooks");
  return { ok: true };
}

/* ── Fire webhooks ───────────────────────────────────────── */
export async function fireWebhooks(
  event: WebhookEvent,
  collectionId: string,
  collectionName: string,
  payload: Record<string, unknown>
) {
  const hooks = await db.webhook.findMany({
    where: {
      active: true,
      OR: [{ collectionId: null }, { collectionId }],
    },
  });

  const matched = hooks.filter((h) => {
    try { return (JSON.parse(h.events) as string[]).includes(event); }
    catch { return false; }
  });

  if (!matched.length) return;

  const body = JSON.stringify({
    event,
    collection: collectionName,
    timestamp:  new Date().toISOString(),
    data:       payload,
  });

  await Promise.allSettled(
    matched.map(async (hook) => {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (hook.secret) {
        const sig = createHmac("sha256", hook.secret).update(body).digest("hex");
        headers["X-Genesis-Signature"] = `sha256=${sig}`;
      }
      try {
        await fetch(hook.url, { method: "POST", headers, body, signal: AbortSignal.timeout(8000) });
        await db.webhook.update({ where: { id: hook.id }, data: { lastFiredAt: new Date() } });
      } catch { /* fire-and-forget — don't fail the main operation */ }
    })
  );
}

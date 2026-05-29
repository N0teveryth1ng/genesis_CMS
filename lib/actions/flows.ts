"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

/* ── Types (not exported from server action file) ────────── */

export type TriggerConfig = {
  type: "record.create" | "record.update" | "record.delete" | "manual";
  collectionId?: string;
  collectionName?: string;
};

export type FlowStep =
  | { id: string; type: "condition"; field: string; op: string; value: string }
  | { id: string; type: "webhook";   url: string; method: string; headers?: string; body?: string }
  | { id: string; type: "create_record"; collectionId: string; data: string }
  | { id: string; type: "log"; message: string };

/* ── CRUD ────────────────────────────────────────────────── */

export async function getFlows() {
  return db.flow.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { runs: true } } },
  });
}

export async function getFlow(id: string) {
  return db.flow.findUnique({
    where: { id },
    include: { runs: { orderBy: { startedAt: "desc" }, take: 20 } },
  });
}

export async function createFlow(formData: FormData) {
  const name        = String(formData.get("name")        ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const triggerType = String(formData.get("triggerType") ?? "manual") as TriggerConfig["type"];
  const collectionId   = String(formData.get("collectionId") ?? "").trim() || undefined;
  const collectionName = String(formData.get("collectionName") ?? "").trim() || undefined;

  if (!name) throw new Error("Name is required");

  const trigger: TriggerConfig = { type: triggerType, collectionId, collectionName };

  const flow = await db.flow.create({
    data: { name, description, trigger: JSON.stringify(trigger), steps: "[]" },
  });

  revalidatePath("/flows");
  return { ok: true, flow };
}

export async function updateFlow(id: string, data: {
  name?: string;
  description?: string;
  active?: boolean;
  trigger?: TriggerConfig;
  steps?: FlowStep[];
}) {
  const updated = await db.flow.update({
    where: { id },
    data: {
      ...(data.name        !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.active      !== undefined && { active: data.active }),
      ...(data.trigger     !== undefined && { trigger: JSON.stringify(data.trigger) }),
      ...(data.steps       !== undefined && { steps: JSON.stringify(data.steps) }),
    },
  });
  revalidatePath("/flows");
  revalidatePath(`/flows/${id}`);
  return { ok: true, flow: updated };
}

export async function deleteFlow(id: string) {
  await db.flow.delete({ where: { id } });
  revalidatePath("/flows");
  return { ok: true };
}

/* ── Manual run ──────────────────────────────────────────── */

export async function runFlowManually(id: string) {
  const { runFlow } = await import("@/lib/flows/runner");
  return runFlow(id, { trigger: "manual", payload: {} });
}

/* ── Triggered by record events ──────────────────────────── */

export async function triggerFlows(
  event: "record.create" | "record.update" | "record.delete",
  collectionId: string,
  payload: Record<string, unknown>,
) {
  const flows = await db.flow.findMany({
    where: { active: true },
  });

  const matching = flows.filter((f) => {
    try {
      const t = JSON.parse(f.trigger) as TriggerConfig;
      if (t.type !== event) return false;
      if (t.collectionId && t.collectionId !== collectionId) return false;
      return true;
    } catch { return false; }
  });

  for (const flow of matching) {
    const { runFlow } = await import("@/lib/flows/runner");
    runFlow(flow.id, { trigger: event, payload }).catch(() => {});
  }
}

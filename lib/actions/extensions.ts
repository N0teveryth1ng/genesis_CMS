"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export async function getExtensions() {
  return db.extension.findMany({ orderBy: { createdAt: "asc" } });
}

export async function installExtension(data: {
  pluginId:     string;
  collectionId?: string;
  events?:      string;
  config?:      Record<string, unknown>;
}) {
  const ext = await db.extension.create({
    data: {
      pluginId:     data.pluginId,
      collectionId: data.collectionId ?? null,
      events:       data.events ?? "create,update",
      config:       JSON.stringify(data.config ?? {}),
    },
  });
  revalidatePath("/extensions");
  return { ok: true, ext };
}

export async function updateExtension(id: string, data: {
  active?:      boolean;
  collectionId?: string | null;
  events?:      string;
  config?:      Record<string, unknown>;
}) {
  const ext = await db.extension.update({
    where: { id },
    data: {
      ...(data.active      !== undefined && { active: data.active }),
      ...(data.collectionId !== undefined && { collectionId: data.collectionId }),
      ...(data.events      !== undefined && { events: data.events }),
      ...(data.config      !== undefined && { config: JSON.stringify(data.config) }),
    },
  });
  revalidatePath("/extensions");
  return { ok: true, ext };
}

export async function uninstallExtension(id: string) {
  await db.extension.delete({ where: { id } });
  revalidatePath("/extensions");
  return { ok: true };
}

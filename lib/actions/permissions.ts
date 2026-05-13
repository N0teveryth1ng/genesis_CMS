"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export type ActionType = "canRead" | "canCreate" | "canUpdate" | "canDelete";

/* Default permissions when no record exists */
const DEFAULTS: Record<string, Record<ActionType, boolean>> = {
  editor: { canRead: true,  canCreate: true,  canUpdate: true,  canDelete: false },
  viewer: { canRead: true,  canCreate: false, canUpdate: false, canDelete: false },
};

/* Resolve effective permissions for a role+collection — falls back to defaults */
export async function getEffectivePermissions(role: string, collectionId: string) {
  if (role === "admin") {
    return { canRead: true, canCreate: true, canUpdate: true, canDelete: true };
  }

  const perm = await db.permission.findUnique({
    where: { role_collectionId: { role, collectionId } },
  });

  return perm ?? (DEFAULTS[role] ?? { canRead: false, canCreate: false, canUpdate: false, canDelete: false });
}

/* Get all permissions for all collections (for the permissions admin page) */
export async function getAllPermissions() {
  const [collections, permissions] = await Promise.all([
    db.collection.findMany({ orderBy: { label: "asc" }, select: { id: true, name: true, label: true } }),
    db.permission.findMany(),
  ]);

  return { collections, permissions };
}

/* Upsert a permission row */
export async function upsertPermission(
  role: string,
  collectionId: string,
  actions: Partial<Record<ActionType, boolean>>
) {
  const defaults = DEFAULTS[role] ?? { canRead: false, canCreate: false, canUpdate: false, canDelete: false };

  await db.permission.upsert({
    where:  { role_collectionId: { role, collectionId } },
    update: actions,
    create: { role, collectionId, ...defaults, ...actions },
  });

  revalidatePath("/permissions");
  return { ok: true };
}

/* Reset a collection's permissions back to defaults */
export async function resetPermissions(role: string, collectionId: string) {
  await db.permission.deleteMany({ where: { role, collectionId } });
  revalidatePath("/permissions");
  return { ok: true };
}

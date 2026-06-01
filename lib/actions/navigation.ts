"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getActiveWorkspaceId } from "@/lib/workspace-context";

export async function getNavMenus() {
  const wsId = await getActiveWorkspaceId();
  return db.navMenu.findMany({
    where:   wsId ? { OR: [{ workspaceId: wsId }, { workspaceId: null }] } : undefined,
    orderBy: { createdAt: "asc" },
  });
}

export async function getNavMenuById(id: string) {
  return db.navMenu.findUnique({ where: { id } });
}

export async function createNavMenu(name: string) {
  const wsId = await getActiveWorkspaceId();
  const menu = await db.navMenu.create({ data: { name, workspaceId: wsId } });
  revalidatePath("/navigation");
  return menu;
}

export async function updateNavMenu(id: string, data: { name?: string; items?: string }) {
  await db.navMenu.update({ where: { id }, data });
  revalidatePath("/navigation");
}

export async function deleteNavMenu(id: string) {
  await db.navMenu.delete({ where: { id } });
  revalidatePath("/navigation");
}

"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getNavMenus() {
  return db.navMenu.findMany({ orderBy: { createdAt: "asc" } });
}

export async function getNavMenuById(id: string) {
  return db.navMenu.findUnique({ where: { id } });
}

export async function createNavMenu(name: string) {
  const menu = await db.navMenu.create({ data: { name } });
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

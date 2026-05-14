"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getPages() {
  return db.page.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getPage(id: string) {
  return db.page.findUnique({ where: { id } });
}

export async function getPageBySlug(slug: string) {
  return db.page.findUnique({ where: { slug } });
}

export async function createPage(fd: FormData) {
  const title = (fd.get("title") as string).trim();
  const slug  = (fd.get("slug")  as string).trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  if (!title || !slug) throw new Error("Title and slug are required");

  const existing = await db.page.findUnique({ where: { slug } });
  if (existing) throw new Error("A page with this slug already exists");

  const page = await db.page.create({ data: { title, slug } });
  revalidatePath("/pages");
  return page;
}

export async function deletePage(id: string) {
  await db.page.delete({ where: { id } });
  revalidatePath("/pages");
}

export async function updatePageBlocks(id: string, blocks: unknown[]) {
  await db.page.update({ where: { id }, data: { blocks: JSON.stringify(blocks) } });
  revalidatePath("/pages");
}

export async function updatePageStatus(id: string, status: "draft" | "published") {
  await db.page.update({ where: { id }, data: { status } });
  revalidatePath("/pages");
}

export async function updatePageMeta(id: string, data: { title?: string; seoTitle?: string; seoDesc?: string }) {
  await db.page.update({ where: { id }, data });
  revalidatePath("/pages");
}

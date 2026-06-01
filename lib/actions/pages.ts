"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { broadcast } from "@/lib/sse";

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
  const page = await db.page.findUnique({ where: { id }, select: { title: true, slug: true } });
  await db.page.update({ where: { id }, data: { blocks: JSON.stringify(blocks) } });
  revalidatePath("/pages");
  broadcast("page_saved", { id, title: page?.title, slug: page?.slug });
}

export async function updatePageStatus(id: string, status: "draft" | "published") {
  const page = await db.page.findUnique({ where: { id }, select: { title: true, slug: true } });
  await db.page.update({ where: { id }, data: { status } });
  revalidatePath("/pages");
  broadcast("page_published", { id, title: page?.title, slug: page?.slug, status });
}

export async function getPublishedPages() {
  return db.page.findMany({
    where:   { status: "published" },
    select:  { id: true, title: true, slug: true },
    orderBy: { title: "asc" },
  });
}

export async function updatePageMeta(id: string, data: { title?: string; seoTitle?: string; seoDesc?: string }) {
  await db.page.update({ where: { id }, data });
  revalidatePath("/pages");
}

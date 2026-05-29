"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getFormSubmissions(pageId?: string) {
  return db.formSubmission.findMany({
    where:   pageId ? { pageId } : undefined,
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteFormSubmission(id: string) {
  await db.formSubmission.delete({ where: { id } });
  revalidatePath("/forms");
}

export async function getFormSubmissionPages() {
  const rows = await db.formSubmission.findMany({
    select:   { pageId: true, pageSlug: true },
    distinct: ["pageId"],
    orderBy:  { createdAt: "desc" },
  });
  return rows;
}

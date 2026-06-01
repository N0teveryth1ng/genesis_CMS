"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { deleteStoredFile } from "@/lib/storage";

export async function getFiles(page = 1, pageSize = 60) {
  const [files, total] = await Promise.all([
    db.file.findMany({
      orderBy: { createdAt: "desc" },
      skip:    (page - 1) * pageSize,
      take:    pageSize,
    }),
    db.file.count(),
  ]);
  return { files, total };
}

export async function deleteFile(id: string) {
  const file = await db.file.findUnique({ where: { id } });
  if (!file) throw new Error("File not found");

  await deleteStoredFile(file.path);

  if (file.thumbnailUrl) {
    const thumbPath = file.thumbnailUrl.replace(/^\/uploads\//, "");
    await deleteStoredFile(thumbPath).catch(() => {});
  }

  await db.file.delete({ where: { id } });
  revalidatePath("/files");
  return { ok: true };
}

export async function getFileCount() {
  return db.file.count();
}

"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

/* ── Singleton helpers ───────────────────────────────────── */
async function ensureSettings() {
  const existing = await db.settings.findUnique({ where: { id: "singleton" } });
  if (existing) return existing;
  return db.settings.create({ data: { id: "singleton" } });
}

export async function getSettings() {
  return ensureSettings();
}

export async function updateWorkspaceSettings(formData: FormData) {
  const siteName    = String(formData.get("siteName")    ?? "").trim() || "Genesis CMS";
  const description = String(formData.get("description") ?? "").trim();
  const logoUrl     = String(formData.get("logoUrl")     ?? "").trim();
  const timezone    = String(formData.get("timezone")    ?? "UTC");

  await ensureSettings();
  await db.settings.update({
    where: { id: "singleton" },
    data:  { siteName, description, logoUrl, timezone },
  });

  revalidatePath("/settings");
  return { ok: true };
}

export async function updateAccount(userId: string, formData: FormData) {
  const name        = String(formData.get("name")        ?? "").trim();
  const newPassword = String(formData.get("newPassword") ?? "").trim();
  const curPassword = String(formData.get("curPassword") ?? "").trim();

  if (!name) throw new Error("Name is required");

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const data: Record<string, unknown> = { name };

  if (newPassword) {
    if (!curPassword) throw new Error("Enter your current password to set a new one");
    const valid = await bcrypt.compare(curPassword, user.password);
    if (!valid) throw new Error("Current password is incorrect");
    if (newPassword.length < 6) throw new Error("New password must be at least 6 characters");
    data.password = await bcrypt.hash(newPassword, 10);
  }

  await db.user.update({ where: { id: userId }, data });
  revalidatePath("/settings");
  return { ok: true };
}

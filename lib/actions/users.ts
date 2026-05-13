"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { logAudit } from "./audit";

const VALID_ROLES = ["admin", "editor", "viewer"] as const;
type Role = (typeof VALID_ROLES)[number];

export async function getUsers() {
  return db.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true, name: true, email: true,
      role: true, active: true, createdAt: true, avatar: true,
    },
  });
}

export async function createUser(formData: FormData) {
  const name     = String(formData.get("name")     ?? "").trim();
  const email    = String(formData.get("email")    ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();
  const role     = String(formData.get("role")     ?? "viewer") as Role;

  if (!name)     throw new Error("Name is required");
  if (!email)    throw new Error("Email is required");
  if (!password) throw new Error("Password is required");
  if (password.length < 6) throw new Error("Password must be at least 6 characters");
  if (!VALID_ROLES.includes(role)) throw new Error("Invalid role");

  const exists = await db.user.findUnique({ where: { email } });
  if (exists) throw new Error("A user with that email already exists");

  const hashed = await bcrypt.hash(password, 10);
  const user = await db.user.create({ data: { name, email, password: hashed, role } });
  logAudit("create", "user", user.id, { name, email, role }).catch(() => {});

  revalidatePath("/users");
  return { ok: true };
}

export async function updateUser(id: string, formData: FormData) {
  const name   = String(formData.get("name")   ?? "").trim();
  const role   = String(formData.get("role")   ?? "viewer") as Role;
  const active = formData.get("active") === "true";

  if (!name) throw new Error("Name is required");
  if (!VALID_ROLES.includes(role)) throw new Error("Invalid role");

  const newPassword = String(formData.get("password") ?? "").trim();
  const data: Record<string, unknown> = { name, role, active };
  if (newPassword) {
    if (newPassword.length < 6) throw new Error("Password must be at least 6 characters");
    data.password = await bcrypt.hash(newPassword, 10);
  }

  await db.user.update({ where: { id }, data });
  logAudit("update", "user", id, { name, role }).catch(() => {});
  revalidatePath("/users");
  return { ok: true };
}

export async function deleteUser(id: string, currentUserId: string) {
  if (id === currentUserId) throw new Error("You cannot delete your own account");
  const user = await db.user.findUnique({ where: { id }, select: { email: true } });
  await db.user.delete({ where: { id } });
  logAudit("delete", "user", id, { email: user?.email }).catch(() => {});
  revalidatePath("/users");
  return { ok: true };
}

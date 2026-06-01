"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { setActiveWorkspaceId } from "@/lib/workspace-context";
import { sendEmail, workspaceInviteHtml } from "@/lib/email";

export async function getWorkspaces() {
  return db.workspace.findMany({ orderBy: { createdAt: "asc" }, include: { members: true } });
}

export async function createWorkspace(name: string) {
  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const existing = await db.workspace.findUnique({ where: { slug } });
  const finalSlug = existing ? `${slug}-${Date.now()}` : slug;
  const ws = await db.workspace.create({ data: { name, slug: finalSlug } });
  revalidatePath("/workspaces");
  return ws;
}

export async function updateWorkspace(id: string, data: { name?: string; plan?: string }) {
  await db.workspace.update({ where: { id }, data });
  revalidatePath("/workspaces");
}

export async function deleteWorkspace(id: string) {
  await db.workspace.delete({ where: { id } });
  revalidatePath("/workspaces");
}

export async function inviteMember(workspaceId: string, userEmail: string, role: string) {
  const ws = await db.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } });
  await db.workspaceMember.upsert({
    where:  { workspaceId_userEmail: { workspaceId, userEmail } },
    create: { workspaceId, userEmail, role },
    update: { role },
  });
  if (ws) {
    const loginUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/login`;
    await sendEmail({
      to:      userEmail,
      subject: `You've been invited to ${ws.name} on Genesis CMS`,
      html:    workspaceInviteHtml(ws.name, role, loginUrl),
    });
  }
  revalidatePath("/workspaces");
}

export async function removeMember(id: string) {
  await db.workspaceMember.delete({ where: { id } });
  revalidatePath("/workspaces");
}

export async function switchWorkspace(id: string | null) {
  await setActiveWorkspaceId(id);
}

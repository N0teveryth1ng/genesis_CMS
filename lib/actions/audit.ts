"use server";

import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export type AuditAction = "create" | "update" | "delete";
export type AuditResource = "record" | "collection" | "user" | "webhook" | "api_key" | "file";

interface AuditMeta {
  collectionName?: string;
  label?: string;
  name?: string;
  [key: string]: unknown;
}

/* Called internally — never exported as a public action */
export async function logAudit(
  action: AuditAction,
  resource: AuditResource,
  resourceId: string | null,
  meta?: AuditMeta
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id?: string; email?: string } | undefined;
    await db.auditLog.create({
      data: {
        userId:     user?.id    ?? null,
        userEmail:  user?.email ?? null,
        action,
        resource,
        resourceId: resourceId ?? null,
        meta:       meta ? JSON.stringify(meta) : null,
      },
    });
  } catch { /* audit must never break main operations */ }
}

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  meta: string | null;
  createdAt: Date;
}

export async function getAuditLogs(page = 1, limit = 50) {
  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip:  (page - 1) * limit,
      take:  limit,
    }),
    db.auditLog.count(),
  ]);
  return { logs, total, page, limit };
}

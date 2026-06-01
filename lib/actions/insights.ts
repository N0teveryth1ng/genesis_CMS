"use server";

import { db } from "@/lib/db";

export async function getInsights() {
  const [
    totalPages,
    publishedCount,
    submissionCount,
    fileStats,
    auditCount,
    topPages,
    submissionsByPage,
    recentLogs,
  ] = await Promise.all([
    db.page.count(),
    db.page.count({ where: { status: "published" } }),
    db.formSubmission.count(),
    db.file.aggregate({ _sum: { size: true }, _count: { id: true } }),
    db.auditLog.count(),
    db.page.findMany({
      select: { id: true, title: true, slug: true, pageViews: true, status: true },
      orderBy: { pageViews: "desc" },
      take: 8,
    }),
    db.formSubmission.groupBy({
      by: ["pageSlug"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 6,
    }),
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, action: true, resource: true, userEmail: true, createdAt: true, meta: true },
    }),
  ]);

  return {
    totalPages,
    publishedPages: publishedCount,
    draftPages:     totalPages - publishedCount,
    totalSubmissions: submissionCount,
    totalFiles:    fileStats._count.id,
    totalStorage:  fileStats._sum.size ?? 0,
    totalEvents:   auditCount,
    topPages,
    submissionsByPage: submissionsByPage.map((s) => ({ label: `/${s.pageSlug}`, value: s._count.id })),
    recentLogs,
  };
}

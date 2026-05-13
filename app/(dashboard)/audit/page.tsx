import type { Metadata } from "next";
import { getAuditLogs } from "@/lib/actions/audit";
import AuditClient from "./_components/AuditClient";

export const metadata: Metadata = { title: "Audit Log" };
export const dynamic = "force-dynamic";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10));
  const { logs, total, limit } = await getAuditLogs(page);
  return <AuditClient logs={logs} total={total} page={page} limit={limit} />;
}

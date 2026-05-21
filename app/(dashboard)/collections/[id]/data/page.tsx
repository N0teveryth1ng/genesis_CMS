import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection, getRecords } from "@/lib/actions/collections";
import { getGitCollection, getGitRecords } from "@/lib/actions/git";
import { getEffectivePermissions } from "@/lib/actions/permissions";
import DataBrowserClient from "./_components/DataBrowserClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const col = id.startsWith("git-") ? await getGitCollection(id) : await getCollection(id);
  return { title: col ? `${col.label} — Data` : "Data Browser" };
}

export default async function DataBrowserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role ?? "viewer";

  let collection;
  let recordsData: { records: any[]; total: number } = { records: [], total: 0 };
  let perms: { canRead: boolean; canCreate: boolean; canUpdate: boolean; canDelete: boolean };

  if (id.startsWith("git-")) {
    const [gitCol, gitRecs] = await Promise.all([
      getGitCollection(id),
      getGitRecords(id),
    ]);
    collection = gitCol;
    recordsData = gitRecs;
    perms = {
      canRead: true,
      canCreate: role === "admin" || role === "editor",
      canUpdate: role === "admin" || role === "editor",
      canDelete: role === "admin" || role === "editor",
    };
  } else {
    const [dbCol, dbRecs, dbPerms] = await Promise.all([
      getCollection(id),
      getRecords(id),
      getEffectivePermissions(role, id),
    ]);
    collection = dbCol;
    recordsData = dbRecs;
    perms = dbPerms;
  }

  if (!collection) notFound();
  if (!perms.canRead) notFound();

  return (
    <DataBrowserClient
      collection={collection as any}
      initialRecords={recordsData.records}
      total={recordsData.total}
      canCreate={perms.canCreate}
      canUpdate={perms.canUpdate}
      canDelete={perms.canDelete}
    />
  );
}


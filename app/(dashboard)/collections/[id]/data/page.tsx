import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection, getRecords } from "@/lib/actions/collections";
import { getEffectivePermissions } from "@/lib/actions/permissions";
import DataBrowserClient from "./_components/DataBrowserClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const col = await getCollection(id);
  return { title: col ? `${col.label} — Data` : "Data Browser" };
}

export default async function DataBrowserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role ?? "viewer";

  const [collection, { records, total }, perms] = await Promise.all([
    getCollection(id),
    getRecords(id),
    getEffectivePermissions(role, id),
  ]);

  if (!collection) notFound();
  if (!perms.canRead) notFound();

  return (
    <DataBrowserClient
      collection={collection}
      initialRecords={records}
      total={total}
      canCreate={perms.canCreate}
      canUpdate={perms.canUpdate}
      canDelete={perms.canDelete}
    />
  );
}

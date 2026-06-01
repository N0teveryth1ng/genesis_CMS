import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCollection, getCollections } from "@/lib/actions/collections";
import { getGitCollection } from "@/lib/actions/git";
import { getRelations } from "@/lib/actions/relations";
import CollectionDetailClient from "./_components/CollectionDetailClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const col = id.startsWith("git-") ? await getGitCollection(id) : await getCollection(id);
  return { title: col ? col.label : "Collection" };
}

export default async function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isGit = id.startsWith("git-");

  const [collection, allCollections] = await Promise.all([
    isGit ? getGitCollection(id) : getCollection(id),
    isGit ? Promise.resolve([]) : getCollections(),
  ]);

  if (!collection) notFound();

  const relations = isGit ? [] : await getRelations(id);

  return (
    <CollectionDetailClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection={collection as any}
      relations={relations}
      allCollections={allCollections.map((c) => ({ id: c.id, name: c.name, label: c.label }))}
    />
  );
}

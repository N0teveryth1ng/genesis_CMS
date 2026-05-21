import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCollection } from "@/lib/actions/collections";
import { getGitCollection } from "@/lib/actions/git";
import CollectionDetailClient from "./_components/CollectionDetailClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const col = id.startsWith("git-") ? await getGitCollection(id) : await getCollection(id);
  return { title: col ? col.label : "Collection" };
}

export default async function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const collection = id.startsWith("git-") ? await getGitCollection(id) : await getCollection(id);
  if (!collection) notFound();
  return <CollectionDetailClient collection={collection as any} />;
}


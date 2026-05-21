import type { Metadata } from "next";
import { getCollections } from "@/lib/actions/collections";
import { getGitCollections } from "@/lib/actions/git";
import CollectionsClient from "./_components/CollectionsClient";

export const metadata: Metadata = { title: "Collections" };
export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const [dbCollections, gitCollections] = await Promise.all([
    getCollections(),
    getGitCollections(),
  ]);

  // Combine them into a single list
  const collections = [...dbCollections, ...gitCollections] as any[];

  return <CollectionsClient collections={collections} />;
}


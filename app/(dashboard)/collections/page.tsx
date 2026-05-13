import type { Metadata } from "next";
import { getCollections } from "@/lib/actions/collections";
import CollectionsClient from "./_components/CollectionsClient";

export const metadata: Metadata = { title: "Collections" };
export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const collections = await getCollections();
  return <CollectionsClient collections={collections} />;
}

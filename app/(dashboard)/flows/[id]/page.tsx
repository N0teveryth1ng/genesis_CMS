import { notFound } from "next/navigation";
import { getFlow } from "@/lib/actions/flows";
import { getCollections } from "@/lib/actions/collections";
import FlowEditor from "./_components/FlowEditor";

export const dynamic = "force-dynamic";

export default async function FlowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [flow, collections] = await Promise.all([getFlow(id), getCollections()]);
  if (!flow) notFound();
  return <FlowEditor flow={flow} collections={collections} />;
}

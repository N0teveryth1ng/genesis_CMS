import { getFlows } from "@/lib/actions/flows";
import { getCollections } from "@/lib/actions/collections";
import FlowsClient from "./_components/FlowsClient";

export const metadata = { title: "Flows — Genesis CMS" };
export const dynamic = "force-dynamic";

export default async function FlowsPage() {
  const [flows, collections] = await Promise.all([getFlows(), getCollections()]);
  return <FlowsClient flows={flows} collections={collections} />;
}

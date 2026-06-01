import type { Metadata } from "next";
import { getInsights } from "@/lib/actions/insights";
import InsightsClient from "./_components/InsightsClient";

export const metadata: Metadata = { title: "Insights" };
export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const data = await getInsights();
  return <InsightsClient data={data} />;
}

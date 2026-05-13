import type { Metadata } from "next";
import { getApiKeys } from "@/lib/actions/apikeys";
import ApiKeysClient from "./_components/ApiKeysClient";

export const metadata: Metadata = { title: "API Keys" };
export const dynamic = "force-dynamic";

export default async function ApiKeysPage() {
  const keys = await getApiKeys();
  return <ApiKeysClient keys={keys} />;
}

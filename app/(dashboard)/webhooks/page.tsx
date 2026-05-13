import type { Metadata } from "next";
import { getWebhooks } from "@/lib/actions/webhooks";
import { getCollections } from "@/lib/actions/collections";
import WebhooksClient from "./_components/WebhooksClient";

export const metadata: Metadata = { title: "Webhooks" };

export default async function WebhooksPage() {
  const [webhooks, collections] = await Promise.all([
    getWebhooks(),
    getCollections(),
  ]);

  return (
    <WebhooksClient
      initialWebhooks={webhooks}
      collections={collections.map((c) => ({ id: c.id, label: c.label }))}
    />
  );
}

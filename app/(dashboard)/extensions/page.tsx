import { getExtensions } from "@/lib/actions/extensions";
import { getCollections } from "@/lib/actions/collections";
import { PLUGINS } from "@/lib/extensions/registry";
import ExtensionsClient from "./_components/ExtensionsClient";

export const metadata = { title: "Extensions — Genesis CMS" };
export const dynamic = "force-dynamic";

export default async function ExtensionsPage() {
  const [installed, collections] = await Promise.all([getExtensions(), getCollections()]);
  return <ExtensionsClient plugins={PLUGINS} installed={installed} collections={collections} />;
}

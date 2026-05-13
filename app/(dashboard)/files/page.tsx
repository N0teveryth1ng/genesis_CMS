import type { Metadata } from "next";
import { getFiles } from "@/lib/actions/files";
import FilesClient from "./_components/FilesClient";

export const metadata: Metadata = { title: "Media Library" };
export const dynamic = "force-dynamic";

export default async function FilesPage() {
  const { files, total } = await getFiles();
  return <FilesClient initialFiles={files} total={total} />;
}

import { notFound } from "next/navigation";
import { getPage } from "@/lib/actions/pages";
import PageEditor from "../_components/PageEditor";

export default async function PageEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const page = await getPage(id);
  if (!page) notFound();
  return <PageEditor page={page} />;
}

import { notFound } from "next/navigation";
import { getPage, getPublishedPages } from "@/lib/actions/pages";
import { getNavMenus } from "@/lib/actions/navigation";
import PageEditor from "../_components/PageEditor";

export default async function PageEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [page, pages, menus] = await Promise.all([
    getPage(id),
    getPublishedPages(),
    getNavMenus(),
  ]);
  if (!page) notFound();
  return <PageEditor page={page} pages={pages} menus={menus} />;
}

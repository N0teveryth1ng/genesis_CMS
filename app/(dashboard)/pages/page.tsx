import { getPages } from "@/lib/actions/pages";
import PagesClient from "./_components/PagesClient";

export default async function PagesPage() {
  const pages = await getPages();
  return <PagesClient pages={pages} />;
}

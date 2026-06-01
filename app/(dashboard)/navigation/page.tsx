import { getNavMenus } from "@/lib/actions/navigation";
import { getPublishedPages } from "@/lib/actions/pages";
import NavigationClient from "./_components/NavigationClient";

export default async function NavigationPage() {
  const [menus, pages] = await Promise.all([
    getNavMenus(),
    getPublishedPages(),
  ]);
  return <NavigationClient menus={menus} pages={pages} />;
}

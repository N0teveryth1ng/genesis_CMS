import { getWorkspaces } from "@/lib/actions/workspaces";
import WorkspacesClient from "./_components/WorkspacesClient";

export default async function WorkspacesPage() {
  const workspaces = await getWorkspaces();
  return <WorkspacesClient workspaces={workspaces} />;
}

import DashboardLayout from "@/components/layout/DashboardLayout";
import { getWorkspaces } from "@/lib/actions/workspaces";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const workspaces = await getWorkspaces();
  return <DashboardLayout workspaces={workspaces}>{children}</DashboardLayout>;
}

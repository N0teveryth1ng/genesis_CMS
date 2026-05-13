import type { Metadata } from "next";
import { getAllPermissions } from "@/lib/actions/permissions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import PermissionsClient from "./_components/PermissionsClient";

export const metadata: Metadata = { title: "Roles & Permissions" };
export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;

  if (role !== "admin") {
    return (
      <div className="p-6 max-w-2xl mx-auto flex flex-col items-center justify-center gap-3 py-24">
        <p className="text-lg font-semibold" style={{ color: "var(--text)" }}>Access Denied</p>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Only admins can manage roles and permissions.
          {role ? ` You are logged in as: ${role}.` : " You are not logged in."}
        </p>
      </div>
    );
  }

  const { collections, permissions } = await getAllPermissions();
  return <PermissionsClient collections={collections} permissions={permissions} />;
}

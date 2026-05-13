import type { Metadata } from "next";
import { getUsers } from "@/lib/actions/users";
import UsersClient from "./_components/UsersClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = { title: "Users" };
export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const [users, session] = await Promise.all([getUsers(), getServerSession(authOptions)]);
  const currentUserId   = (session?.user as { id?: string; role?: string })?.id   ?? "";
  const currentUserRole = (session?.user as { id?: string; role?: string })?.role ?? "viewer";
  return <UsersClient users={users} currentUserId={currentUserId} currentUserRole={currentUserRole} />;
}

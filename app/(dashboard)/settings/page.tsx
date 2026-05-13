import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSettings } from "@/lib/actions/settings";
import { db } from "@/lib/db";
import SettingsClient from "./_components/SettingsClient";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [session, settings] = await Promise.all([
    getServerSession(authOptions),
    getSettings(),
  ]);

  const sessionUser = session?.user as { id?: string; role?: string; name?: string; email?: string };
  const userId = sessionUser?.id ?? "";
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  });

  return (
    <SettingsClient
      settings={settings}
      user={user ?? { id: "", name: "", email: "", role: "viewer" }}
    />
  );
}

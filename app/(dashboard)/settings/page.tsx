import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSettings, getGitIntegration } from "@/lib/actions/settings";
import { db } from "@/lib/db";
import SettingsClient from "./_components/SettingsClient";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [session, settings, gitIntegration] = await Promise.all([
    getServerSession(authOptions),
    getSettings(),
    getGitIntegration(),
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
      gitIntegration={gitIntegration}
      hasOAuthConfigured={Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET)}
    />
  );
}


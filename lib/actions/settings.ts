"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

/* ── Singleton helpers ───────────────────────────────────── */
async function ensureSettings() {
  const existing = await db.settings.findUnique({ where: { id: "singleton" } });
  if (existing) return existing;
  return db.settings.create({ data: { id: "singleton" } });
}

export async function getSettings() {
  return ensureSettings();
}

export async function updateWorkspaceSettings(formData: FormData) {
  const siteName    = String(formData.get("siteName")    ?? "").trim() || "Genesis CMS";
  const description = String(formData.get("description") ?? "").trim();
  const logoUrl     = String(formData.get("logoUrl")     ?? "").trim();
  const timezone    = String(formData.get("timezone")    ?? "UTC");

  await ensureSettings();
  await db.settings.update({
    where: { id: "singleton" },
    data:  { siteName, description, logoUrl, timezone },
  });

  revalidatePath("/settings");
  return { ok: true };
}

export async function updateAccount(userId: string, formData: FormData) {
  const name        = String(formData.get("name")        ?? "").trim();
  const newPassword = String(formData.get("newPassword") ?? "").trim();
  const curPassword = String(formData.get("curPassword") ?? "").trim();

  if (!name) throw new Error("Name is required");

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const data: Record<string, unknown> = { name };

  if (newPassword) {
    if (!curPassword) throw new Error("Enter your current password to set a new one");
    const valid = await bcrypt.compare(curPassword, user.password);
    if (!valid) throw new Error("Current password is incorrect");
    if (newPassword.length < 6) throw new Error("New password must be at least 6 characters");
    data.password = await bcrypt.hash(newPassword, 10);
  }

  await db.user.update({ where: { id: userId }, data });
  revalidatePath("/settings");
  return { ok: true };
}

/* ── Git Integration Server Actions ─────────────────────── */
async function ensureGitIntegration() {
  const existing = await db.gitIntegration.findUnique({ where: { id: "singleton" } });
  if (existing) return existing;
  return db.gitIntegration.create({ data: { id: "singleton" } });
}

export async function getGitIntegration() {
  const integration = await ensureGitIntegration();
  return {
    ...integration,
    accessToken: integration.accessToken ? "••••••••" : "",
  };
}

export async function updateGitIntegration(formData: FormData) {
  const enabled = formData.get("enabled") === "true";
  const owner = String(formData.get("owner") ?? "").trim();
  const repo = String(formData.get("repo") ?? "").trim();
  const branch = String(formData.get("branch") ?? "").trim() || "main";
  const configPath = String(formData.get("configPath") ?? "").trim() || ".genesis/config.json";
  let accessToken = String(formData.get("accessToken") ?? "").trim();
  const webhookEnabled = formData.get("webhookEnabled") === "true";
  const webhookUrl = String(formData.get("webhookUrl") ?? "").trim();

  const current = await ensureGitIntegration();

  // If the user didn't change the token, preserve the old one
  if (accessToken === "••••••••") {
    accessToken = current.accessToken;
  }

  await db.gitIntegration.update({
    where: { id: "singleton" },
    data: {
      enabled,
      owner,
      repo,
      branch,
      configPath,
      accessToken,
      webhookEnabled,
      webhookUrl,
    },
  });

  revalidatePath("/settings");
  return { ok: true };
}


export async function testGitConnection(owner: string, repo: string, branch: string, token: string) {
  if (!owner || !repo) {
    throw new Error("Repository owner and name are required");
  }

  const current = await ensureGitIntegration();
  const actualToken = token === "••••••••" ? current.accessToken : token;

  const headers: Record<string, string> = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "Genesis-CMS",
  };

  if (actualToken) {
    headers["Authorization"] = `Bearer ${actualToken}`;
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches/${branch}`, {
      headers,
      cache: "no-store",
    });

    if (res.status === 200) {
      return { ok: true, msg: "Successfully connected to repository and branch!" };
    }

    if (res.status === 404) {
      throw new Error("Repository or branch not found. Double check permissions and spelling.");
    }

    if (res.status === 401) {
      throw new Error("Invalid GitHub Personal Access Token.");
    }

    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `Failed to connect with status ${res.status}`);
  } catch (err: unknown) {
    throw new Error(err instanceof Error ? err.message : "Network error connecting to GitHub API");
  }
}

export async function getGitHubOAuthUrl() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return { success: false, msg: "Missing GITHUB_CLIENT_ID" };
  }
  const redirectUri = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/github/callback`;
  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=repo,read:user`;
  return { success: true, url };
}


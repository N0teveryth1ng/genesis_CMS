"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { bootstrapSiteContent } from "@/lib/actions/migrate";

export interface GitField {
  id: string;
  collectionId: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  unique: boolean;
  hidden: boolean;
  defaultValue: string | null;
  options: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GitCollection {
  id: string; // "git-slug"
  name: string;
  label: string;
  icon: string;
  description: string | null;
  folder: string;
  format: "json" | "md" | "yaml";
  fields: GitField[];
  _count: {
    fields: number;
  };
  isGitBacked: true;
  createdAt: Date;
  updatedAt: Date;
}

/* ── Helper: Fetch Active Git integration ───────────────── */
async function getActiveIntegration() {
  const integration = await db.gitIntegration.findUnique({
    where: { id: "singleton" },
  });
  if (!integration || !integration.enabled || !integration.owner || !integration.repo) {
    return null;
  }
  return integration;
}

/* ── getGitCollections ──────────────────────────────────── */
export async function getGitCollections(): Promise<GitCollection[]> {
  const git = await getActiveIntegration();
  if (!git) return [];

  const headers: Record<string, string> = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "Genesis-CMS",
    "Cache-Control": "no-store",
  };
  if (git.accessToken) {
    headers["Authorization"] = `Bearer ${git.accessToken}`;
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${git.owner}/${git.repo}/contents/${git.configPath}?ref=${git.branch}`,
      { headers }
    );

    if (res.status !== 200) {
      console.warn(`[git-sync] Failed to fetch config at ${git.configPath}: status ${res.status}`);
      return [];
    }

    const fileMeta = await res.json();
    const rawContent = Buffer.from(fileMeta.content, "base64").toString("utf-8");
    const config = JSON.parse(rawContent);

    if (!config || !Array.isArray(config.collections)) {
      console.warn("[git-sync] Invalid config structure: missing collections array");
      return [];
    }

    return config.collections.map((col: any, index: number) => {
      const colId = `git-${col.name}`;
      const fields = (col.fields ?? []).map((f: any, fIndex: number) => ({
        id: `git-field-${col.name}-${f.name}`,
        collectionId: colId,
        name: f.name,
        label: f.label ?? f.name,
        type: f.type ?? "text",
        required: !!f.required,
        unique: !!f.unique,
        hidden: !!f.hidden,
        defaultValue: f.defaultValue ?? null,
        options: f.options ? JSON.stringify(f.options) : null,
        sortOrder: fIndex,
        createdAt: new Date(git.createdAt),
        updatedAt: new Date(git.updatedAt),
      }));

      return {
        id: colId,
        name: col.name,
        label: col.label ?? col.name,
        icon: col.icon ?? "FileText",
        description: col.description ?? `Git-backed collection syncing with folder: ${col.folder}`,
        folder: col.folder ?? `content/${col.name}`,
        format: col.format ?? "json",
        fields,
        _count: {
          fields: fields.length,
        },
        isGitBacked: true,
        createdAt: new Date(git.createdAt),
        updatedAt: new Date(git.updatedAt),
      };
    });
  } catch (err) {
    console.error("[git-sync] Error parsing git collections:", err);
    return [];
  }
}

/* ── getGitCollection ───────────────────────────────────── */
export async function getGitCollection(id: string): Promise<GitCollection | null> {
  if (!id.startsWith("git-")) return null;
  const collections = await getGitCollections();
  return collections.find((c) => c.id === id) ?? null;
}

/* ── getGitRecords ──────────────────────────────────────── */
export async function getGitRecords(collectionId: string, page = 1, pageSize = 50) {
  const git = await getActiveIntegration();
  const col = await getGitCollection(collectionId);

  if (!git || !col) {
    return { records: [], total: 0, page, pageSize };
  }

  const headers: Record<string, string> = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "Genesis-CMS",
    "Cache-Control": "no-store",
  };
  if (git.accessToken) {
    headers["Authorization"] = `Bearer ${git.accessToken}`;
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${git.owner}/${git.repo}/contents/${col.folder}?ref=${git.branch}`,
      { headers }
    );

    if (res.status === 404) {
      // Folder doesn't exist yet, return empty
      return { records: [], total: 0, page, pageSize };
    }

    if (res.status !== 200) {
      console.error(`[git-sync] Failed to fetch folder contents for ${col.folder}: status ${res.status}`);
      return { records: [], total: 0, page, pageSize };
    }

    const files = await res.json();
    if (!Array.isArray(files)) {
      return { records: [], total: 0, page, pageSize };
    }

    // Filter to only match JSON/MD/YAML depending on config
    const targetExt = `.${col.format}`;
    const filteredFiles = files.filter((f) => f.type === "file" && f.name.endsWith(targetExt));

    // Sort by name or path
    filteredFiles.sort((a, b) => a.name.localeCompare(b.name));

    // Paginate file list
    const total = filteredFiles.length;
    const paginated = filteredFiles.slice((page - 1) * pageSize, page * pageSize);

    // Fetch details/content for each paginated file
    const records = await Promise.all(
      paginated.map(async (file) => {
        try {
          const detailRes = await fetch(file.url, { headers });
          if (detailRes.status !== 200) throw new Error("Fetch failed");

          const fileMeta = await detailRes.json();
          const rawContent = Buffer.from(fileMeta.content, "base64").toString("utf-8");

          let parsedData: Record<string, any> = {};

          if (col.format === "json") {
            parsedData = JSON.parse(rawContent);
          } else {
            // Basic fallback for YAML/Markdown parsing if not standard JSON
            parsedData = { content: rawContent };
          }

          return {
            id: file.name, // The filename serves as the unique ID for Git records
            collectionId,
            data: JSON.stringify(parsedData),
            createdAt: new Date(git.createdAt),
            updatedAt: new Date(git.updatedAt),
          };
        } catch (err) {
          console.error(`[git-sync] Failed to read record file ${file.name}:`, err);
          return {
            id: file.name,
            collectionId,
            data: JSON.stringify({ error: "Failed to parse content file" }),
            createdAt: new Date(git.createdAt),
            updatedAt: new Date(git.updatedAt),
          };
        }
      })
    );

    return { records, total, page, pageSize };
  } catch (err) {
    console.error("[git-sync] Error fetching git records:", err);
    return { records: [], total: 0, page, pageSize };
  }
}

/* ── Git-backed Records Write Actions ────────────────────── */

export async function createGitRecord(collectionId: string, data: Record<string, unknown>) {
  const git = await getActiveIntegration();
  const col = await getGitCollection(collectionId);
  if (!git || !col) throw new Error("Git integration is not connected");

  // Determine filename
  let slugSource = String(data.slug ?? data.title ?? data.name ?? "").trim();
  if (!slugSource) {
    slugSource = `record-${Math.random().toString(36).substring(2, 9)}`;
  }
  const name = slugify(slugSource);
  const filename = `${name}.${col.format}`;
  const filePath = `${col.folder}/${filename}`;

  const headers: Record<string, string> = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "Genesis-CMS",
    "Content-Type": "application/json",
  };
  if (git.accessToken) {
    headers["Authorization"] = `Bearer ${git.accessToken}`;
  }

  const fileContent = col.format === "json" ? JSON.stringify(data, null, 2) : String(data.content ?? "");
  const base64Content = Buffer.from(fileContent).toString("base64");

  const body = {
    message: `docs(cms): create ${col.label} record: ${filename}`,
    content: base64Content,
    branch: git.branch,
  };

  const res = await fetch(`https://api.github.com/repos/${git.owner}/${git.repo}/contents/${filePath}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });

  if (res.status !== 201) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `Failed to create file in GitHub with status ${res.status}`);
  }

  revalidatePath(`/collections/${collectionId}/data`);
  
  // Fire Webhook trigger in background asynchronously
  triggerGitWebhook().catch((err) => console.error("[webhook] Error triggering deploy webhook:", err));

  return { ok: true, id: filename };
}

export async function updateGitRecord(recordId: string, collectionId: string, data: Record<string, unknown>) {
  const git = await getActiveIntegration();
  const col = await getGitCollection(collectionId);
  if (!git || !col) throw new Error("Git integration is not connected");

  const filePath = `${col.folder}/${recordId}`;

  const headers: Record<string, string> = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "Genesis-CMS",
    "Content-Type": "application/json",
  };
  if (git.accessToken) {
    headers["Authorization"] = `Bearer ${git.accessToken}`;
  }

  // 1. Fetch file meta to get its current SHA
  const metaRes = await fetch(
    `https://api.github.com/repos/${git.owner}/${git.repo}/contents/${filePath}?ref=${git.branch}`,
    { headers, cache: "no-store" }
  );
  if (metaRes.status !== 200) {
    throw new Error(`Failed to fetch record file meta from GitHub to update: status ${metaRes.status}`);
  }
  const fileMeta = await metaRes.json();
  const sha = fileMeta.sha;

  // 2. Commit updated file
  const fileContent = col.format === "json" ? JSON.stringify(data, null, 2) : String(data.content ?? "");
  const base64Content = Buffer.from(fileContent).toString("base64");

  const body = {
    message: `docs(cms): update ${col.label} record: ${recordId}`,
    content: base64Content,
    sha,
    branch: git.branch,
  };

  const res = await fetch(`https://api.github.com/repos/${git.owner}/${git.repo}/contents/${filePath}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });

  if (res.status !== 200) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `Failed to update file in GitHub with status ${res.status}`);
  }

  revalidatePath(`/collections/${collectionId}/data`);
  
  // Fire Webhook trigger in background asynchronously
  triggerGitWebhook().catch((err) => console.error("[webhook] Error triggering deploy webhook:", err));

  return { ok: true };
}

export async function deleteGitRecord(recordId: string, collectionId: string) {
  const git = await getActiveIntegration();
  const col = await getGitCollection(collectionId);
  if (!git || !col) throw new Error("Git integration is not connected");

  const filePath = `${col.folder}/${recordId}`;

  const headers: Record<string, string> = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "Genesis-CMS",
    "Content-Type": "application/json",
  };
  if (git.accessToken) {
    headers["Authorization"] = `Bearer ${git.accessToken}`;
  }

  // 1. Fetch file meta to get its current SHA
  const metaRes = await fetch(
    `https://api.github.com/repos/${git.owner}/${git.repo}/contents/${filePath}?ref=${git.branch}`,
    { headers, cache: "no-store" }
  );
  if (metaRes.status !== 200) {
    throw new Error(`Failed to fetch record file meta from GitHub to delete: status ${metaRes.status}`);
  }
  const fileMeta = await metaRes.json();
  const sha = fileMeta.sha;

  // 2. Commit deletion
  const body = {
    message: `docs(cms): delete ${col.label} record: ${recordId}`,
    sha,
    branch: git.branch,
  };

  const res = await fetch(`https://api.github.com/repos/${git.owner}/${git.repo}/contents/${filePath}`, {
    method: "DELETE",
    headers,
    body: JSON.stringify(body),
  });

  if (res.status !== 200) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `Failed to delete file from GitHub with status ${res.status}`);
  }

  revalidatePath(`/collections/${collectionId}/data`);
  
  // Fire Webhook trigger in background asynchronously
  triggerGitWebhook().catch((err) => console.error("[webhook] Error triggering deploy webhook:", err));

  return { ok: true };
}

/* ── Webhook Trigger Actions ────────────────────────────── */

export async function triggerGitWebhook() {
  const git = await db.gitIntegration.findUnique({
    where: { id: "singleton" },
  });

  if (!git || !git.webhookEnabled || !git.webhookUrl) {
    return { ok: false, msg: "Webhook is disabled or not configured." };
  }

  // 1. Mark status as triggering
  await db.gitIntegration.update({
    where: { id: "singleton" },
    data: {
      webhookStatus: "triggering",
      lastTriggered: new Date(),
    },
  });

  revalidatePath("/settings");

  try {
    const res = await fetch(git.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        triggeredBy: "Genesis CMS",
        event: "content-update",
        timestamp: new Date().toISOString(),
      }),
    });

    if (res.status >= 200 && res.status < 300) {
      await db.gitIntegration.update({
        where: { id: "singleton" },
        data: { webhookStatus: "success" },
      });
      revalidatePath("/settings");
      return { ok: true, msg: "Deployment webhook successfully triggered!" };
    } else {
      await db.gitIntegration.update({
        where: { id: "singleton" },
        data: { webhookStatus: "failed" },
      });
      revalidatePath("/settings");
      return { ok: false, msg: `Webhook endpoint returned status ${res.status}` };
    }
  } catch (err: unknown) {
    await db.gitIntegration.update({
      where: { id: "singleton" },
      data: { webhookStatus: "failed" },
    });
    revalidatePath("/settings");
    return { ok: false, msg: err instanceof Error ? err.message : "Connection error" };
  }
}

/* ── Automated 1-Click Connection Actions ───────────────── */

export async function fetchUserRepos(token: string) {
  // If token is empty or masked token, read actual token from database
  let actualToken = token;
  if (!token || token === "••••••••") {
    const current = await db.gitIntegration.findUnique({ where: { id: "singleton" } });
    if (!current?.accessToken) throw new Error("GitHub Access Token is required to fetch repositories");
    actualToken = current.accessToken;
  }

  const headers = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "Genesis-CMS",
    "Authorization": `Bearer ${actualToken}`,
  };

  try {
    const res = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated", {
      headers,
      cache: "no-store",
    });

    if (res.status !== 200) {
      if (res.status === 401) throw new Error("Invalid GitHub Access Token");
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `GitHub returned status ${res.status}`);
    }

    const repos = await res.json();
    if (!Array.isArray(repos)) return [];

    return repos.map((r: any) => ({
      id: String(r.id),
      name: r.name,
      owner: r.owner.login,
      fullName: r.full_name,
      description: r.description ?? "",
      defaultBranch: r.default_branch ?? "main",
      private: !!r.private,
    }));
  } catch (err: unknown) {
    throw new Error(err instanceof Error ? err.message : "Failed to fetch repositories from GitHub");
  }
}

export async function autoConnectAndDeployRepo(token: string, owner: string, repo: string) {
  if (!owner || !repo) throw new Error("Owner and Repo are required");

  // Read actual token if empty or masked
  let actualToken = token;
  if (!token || token === "••••••••") {
    const current = await db.gitIntegration.findUnique({ where: { id: "singleton" } });
    if (!current?.accessToken) throw new Error("No saved GitHub token found");
    actualToken = current.accessToken;
  }

  const headers = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "Genesis-CMS",
    "Authorization": `Bearer ${actualToken}`,
    "Content-Type": "application/json",
  };

  try {
    // 1. Fetch repo details to resolve branch name
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers,
      cache: "no-store",
    });
    if (repoRes.status !== 200) {
      throw new Error(`Failed to fetch repository information: Status ${repoRes.status}`);
    }
    const repoInfo = await repoRes.json();
    const branch = repoInfo.default_branch ?? "main";

    // 2. Scan if config exists
    const configPath = ".genesis/config.json";
    const checkConfigRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${configPath}?ref=${branch}`,
      { headers, cache: "no-store" }
    );

    if (checkConfigRes.status !== 200) {
      // Config does not exist! Let's automatically commit starter files!
      const starterConfig = {
        collections: [
          {
            name: "posts",
            label: "Blog Posts",
            folder: "content/posts",
            format: "json",
            icon: "FileText",
            description: "Visual article records committed back to your repo",
            fields: [
              { "name": "title", "label": "Title", "type": "text", "required": true },
              { "name": "slug", "label": "Slug", "type": "text", "required": true },
              { "name": "description", "label": "Description", "type": "textarea" },
              { "name": "published", "label": "Published", "type": "boolean" },
              { "name": "publishedAt", "label": "Publish Date", "type": "date" }
            ]
          },
          {
            name: "pages",
            label: "Pages",
            folder: "content/pages",
            format: "json",
            icon: "Globe",
            description: "Static website page configurations",
            fields: [
              { "name": "title", "label": "Page Title", "type": "text", "required": true },
              { "name": "slug", "label": "Slug Path", "type": "text", "required": true },
              { "name": "content", "label": "Markdown Content", "type": "textarea" }
            ]
          }
        ]
      };

      const starterPost = {
        title: "Welcome to Genesis CMS!",
        slug: "welcome-to-genesis",
        description: "This is your first visual record automatically generated and committed via Genesis CMS. You can edit this or create new records instantly!",
        published: true,
        publishedAt: new Date().toISOString().split("T")[0],
      };

      // A. Commit .genesis/config.json
      const configBase64 = Buffer.from(JSON.stringify(starterConfig, null, 2)).toString("base64");
      const commitConfigBody = {
        message: "chore(cms): initialize genesis visual collections config",
        content: configBase64,
        branch,
      };

      const writeConfigRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${configPath}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify(commitConfigBody),
        }
      );
      if (writeConfigRes.status !== 201) {
        throw new Error(`Failed to commit starter config: Status ${writeConfigRes.status}`);
      }

      // B. Commit content/posts/welcome-to-genesis.json
      const postPath = "content/posts/welcome-to-genesis.json";
      const postBase64 = Buffer.from(JSON.stringify(starterPost, null, 2)).toString("base64");
      const commitPostBody = {
        message: "docs(cms): create welcome starter post",
        content: postBase64,
        branch,
      };

      await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${postPath}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(commitPostBody),
      });
    }

    // 3. Save integration details to DB
    await db.gitIntegration.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        enabled: true,
        owner,
        repo,
        branch,
        configPath,
        accessToken: actualToken,
      },
      update: {
        enabled: true,
        owner,
        repo,
        branch,
        configPath,
        accessToken: actualToken,
      },
    });

    // Auto-create site_content collection for client migration
    bootstrapSiteContent(owner, repo).catch(() => {});

    revalidatePath("/settings");
    return { ok: true, msg: `Successfully connected ${owner}/${repo}!` };
  } catch (err: unknown) {
    throw new Error(err instanceof Error ? err.message : "Zero-config deployment failed");
  }
}



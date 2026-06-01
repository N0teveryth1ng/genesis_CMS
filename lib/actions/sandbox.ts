"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { exec, spawn } from "child_process";
import fs from "fs";
import path from "path";
import util from "util";

const execAsync   = util.promisify(exec);
const SANDBOX_DIR = path.join(process.cwd(), "sandbox");
const PORT        = 4000;

/* ── Log helper ──────────────────────────────────────────── */
async function log(line: string) {
  const ts = new Date().toLocaleTimeString();
  const entry = `[${ts}] ${line}`;
  console.log("[sandbox]", entry);
  try {
    const current = await db.gitIntegration.findUnique({ where: { id: "singleton" } });
    if (!current) return;
    const existing = current.sandboxLogs ?? "";
    const trimmed  = existing.length > 80_000 ? existing.slice(-40_000) : existing;
    await db.gitIntegration.update({
      where: { id: "singleton" },
      data:  { sandboxLogs: trimmed + entry + "\n" },
    });
  } catch { /* non-fatal */ }
}

async function setStatus(status: string, extra?: Record<string, unknown>) {
  await db.gitIntegration.update({
    where: { id: "singleton" },
    data:  { sandboxStatus: status, ...extra },
  });
  revalidatePath("/preview");
}

/* ── Kill whatever is on PORT and wait until it's free ──── */
async function killPort() {
  try {
    const { stdout } = await execAsync(
      `netstat -ano | findstr :${PORT}`,
    ).catch(() => ({ stdout: "" }));
    const pids = [...new Set(
      stdout.split("\n")
        .map((l) => l.trim().split(/\s+/).pop())
        .filter((p) => p && /^\d+$/.test(p) && p !== "0"),
    )];
    for (const pid of pids) {
      await execAsync(`taskkill /PID ${pid} /F`).catch(() => {});
    }
    // Wait up to 4 s for port to actually be released
    for (let i = 0; i < 8; i++) {
      await new Promise((r) => setTimeout(r, 500));
      try {
        await execAsync(`netstat -ano | findstr :${PORT}`);
      } catch {
        break; // port is free
      }
    }
  } catch { /* non-fatal */ }
}

/* ── Detect framework from package.json ──────────────────── */
function detectStartCommand(pkgPath: string): { cmd: string; env: Record<string, string> } {
  const defaultEnv = { PORT: String(PORT), BROWSER: "none" };
  try {
    const pkg  = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    if (deps["next"])          return { cmd: `npx next dev -p ${PORT}`,         env: defaultEnv };
    if (deps["vite"])          return { cmd: `npx vite --port ${PORT} --host`,   env: defaultEnv };
    if (deps["react-scripts"]) return { cmd: "npx react-scripts start",          env: { ...defaultEnv, PORT: String(PORT) } };
    if (deps["@remix-run/dev"])return { cmd: `npx remix dev --port ${PORT}`,     env: defaultEnv };
    if (deps["nuxt"])          return { cmd: `npx nuxt dev --port ${PORT}`,      env: defaultEnv };
    if (deps["astro"])         return { cmd: `npx astro dev --port ${PORT}`,     env: defaultEnv };
    if (deps["@sveltejs/kit"]) return { cmd: `npx vite dev --port ${PORT}`,      env: defaultEnv };

    // Fallback: prefer "dev" script, then "start"
    if (pkg.scripts?.dev)     return { cmd: "npm run dev",   env: defaultEnv };
    if (pkg.scripts?.start)   return { cmd: "npm start",     env: defaultEnv };
  } catch { /* no package.json */ }

  // Static fallback — serve the folder
  return { cmd: `npx serve . -l ${PORT}`, env: {} };
}

/* ── getSandboxStatus ────────────────────────────────────── */
export async function getSandboxStatus() {
  const git = await db.gitIntegration.findUnique({ where: { id: "singleton" } });
  return git ?? {
    sandboxStatus: "idle",
    sandboxPort:   PORT,
    sandboxUrl:    "",
    sandboxLogs:   "",
    owner: "", repo: "", branch: "", enabled: false,
  };
}

/* ── deploySandboxRepository ─────────────────────────────── */
export async function deploySandboxRepository() {
  const git = await db.gitIntegration.findUnique({ where: { id: "singleton" } });
  if (!git?.owner || !git?.repo) throw new Error("No GitHub repo connected. Go to Settings → GitHub Sync.");

  // Fire-and-forget so the UI doesn't wait
  runPipeline(git).catch(async (err) => {
    await log(`❌ Fatal: ${err?.message ?? err}`);
    await setStatus("failed");
  });

  return { ok: true };
}

async function runPipeline(git: { owner: string; repo: string; branch: string; accessToken: string }) {
  const repoDir = path.join(SANDBOX_DIR, `${git.owner}-${git.repo}`);
  const sandboxUrl = `http://localhost:${PORT}`;

  await setStatus("cloning", { sandboxLogs: "", sandboxUrl });
  await log(`🚀 Starting pipeline for ${git.owner}/${git.repo} (${git.branch})`);

  // ── 1. Ensure sandbox dir ──────────────────────────────
  fs.mkdirSync(SANDBOX_DIR, { recursive: true });

  // ── 2. Clone or pull ──────────────────────────────────
  if (fs.existsSync(path.join(repoDir, ".git"))) {
    await log("📂 Repo already cloned — pulling latest changes…");
    try {
      await execAsync(`git -C "${repoDir}" pull origin ${git.branch}`);
      await log("✅ Pull complete.");
    } catch {
      await log("⚠️  Pull failed, re-cloning from scratch…");
      fs.rmSync(repoDir, { recursive: true, force: true });
      await cloneRepo(git, repoDir);
    }
  } else {
    await cloneRepo(git, repoDir);
  }

  // ── 3. Install dependencies ───────────────────────────
  const hasPkg = fs.existsSync(path.join(repoDir, "package.json"));
  if (hasPkg) {
    await setStatus("building");
    await log("📦 Running npm install…");
    try {
      await execAsync("npm install --prefer-offline --no-engine-strict --legacy-peer-deps", { cwd: repoDir, timeout: 180_000 });
      await log("✅ Dependencies installed.");
    } catch (err: unknown) {
      const e = err as { stderr?: string; message?: string };
      await log(`❌ npm install failed: ${e.stderr ?? e.message ?? String(err)}`);
      await setStatus("failed");
      return;
    }
  } else {
    await log("ℹ️  No package.json found — will serve static files.");
  }

  // ── 4. Kill existing process on port ──────────────────
  await killPort();
  await log(`🔪 Cleared port ${PORT}.`);

  // ── 5. Detect & start the app ─────────────────────────
  const pkgPath = path.join(repoDir, "package.json");
  const { cmd, env } = detectStartCommand(pkgPath);
  await log(`▶️  Starting: ${cmd}`);
  await setStatus("building");

  const [bin, ...args] = cmd.split(" ");
  const child = spawn(bin, args, {
    cwd:   repoDir,
    env:   { ...process.env, ...env },
    shell: true,
    detached: true,
    stdio: "pipe",
  });

  child.stdout?.on("data", async (d: Buffer) => { await log(d.toString().trimEnd()); });
  child.stderr?.on("data", async (d: Buffer) => { await log(d.toString().trimEnd()); });

  child.on("error", async (err) => {
    await log(`⚠️ Process error: ${err.message}`);
  });

  // Don't fail immediately on exit — Next.js/Vite sometimes spawn sub-processes
  // and the parent exits with code 1 while the child keeps serving.
  // Let waitForPort be the source of truth.
  child.on("exit", async (code) => {
    if (code !== 0 && code !== null) {
      await log(`⚠️ Launcher exited with code ${code} — checking if port ${PORT} is still active…`);
    }
  });

  child.unref();

  // Wait up to 30 s for port to become active
  await log(`⏳ Waiting for app to start on port ${PORT}…`);
  const ready = await waitForPort(PORT, 30_000);
  if (ready) {
    await log(`🟢 App is live at ${sandboxUrl}`);
    await setStatus("running", { sandboxUrl });
  } else {
    await log("❌ App did not respond within 30s — check logs above for errors.");
    await setStatus("failed");
  }
}

async function cloneRepo(git: { owner: string; repo: string; branch: string; accessToken: string }, repoDir: string) {
  const token    = git.accessToken;
  const cloneUrl = token
    ? `https://${token}@github.com/${git.owner}/${git.repo}.git`
    : `https://github.com/${git.owner}/${git.repo}.git`;

  await log(`📥 Cloning ${git.owner}/${git.repo}…`);
  await execAsync(
    `git clone --depth 1 --branch ${git.branch} "${cloneUrl}" "${repoDir}"`,
    { timeout: 120_000 },
  );
  await log("✅ Clone complete.");
}

async function waitForPort(port: number, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await execAsync(`netstat -ano | findstr :${port}`);
      return true;
    } catch { /* not yet */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

/* ── stopSandboxServer ───────────────────────────────────── */
export async function stopSandboxServer() {
  await killPort();
  await setStatus("idle", { sandboxUrl: "" });
  await log("🛑 Server stopped.");
}

/* ── clearSandboxLogs ────────────────────────────────────── */
export async function clearSandboxLogs() {
  await db.gitIntegration.update({
    where: { id: "singleton" },
    data:  { sandboxLogs: "" },
  });
  revalidatePath("/preview");
}

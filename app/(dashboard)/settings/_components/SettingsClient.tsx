"use client";

import { useState, useTransition, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle2, Building2, User, Palette, GitBranch, Search, Sparkles, Lock, FolderGit, ArrowRight, HelpCircle, Copy, Check, KeyRound } from "lucide-react";
import { updateWorkspaceSettings, updateAccount, updateGitIntegration, testGitConnection, getGitHubOAuthUrl } from "@/lib/actions/settings";
import { triggerGitWebhook, fetchUserRepos, autoConnectAndDeployRepo } from "@/lib/actions/git";
import { useUIStore } from "@/lib/stores/ui";

const GithubIcon = ({ size, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    viewBox="0 0 24 24"
    width={size ?? 16}
    height={size ?? 16}
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

type Settings = {
  id: string; siteName: string; description: string; logoUrl: string; timezone: string;
};
type UserInfo = { id: string; name: string; email: string; role: string };
type GitInfo = {
  id: string;
  enabled: boolean;
  owner: string;
  repo: string;
  branch: string;
  configPath: string;
  accessToken: string;
  webhookUrl: string;
  webhookEnabled: boolean;
  webhookStatus: string;
  lastTriggered: Date | string | null;
};

const TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Kolkata", "Asia/Tokyo",
  "Asia/Singapore", "Australia/Sydney",
];


const THEMES = [
  { value: "dark",  label: "Dark",  desc: "Deep navy — default Genesis look" },
  { value: "light", label: "Light", desc: "Clean white interface" },
];

/* ── Shared input style ──────────────────────────────────── */
interface InputProps {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

function Input({
  label, name, type = "text", defaultValue = "", placeholder = "", required = false, disabled = false,
}: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>
        {label} {required && <span style={{ color: "var(--danger)" }}>*</span>}
      </label>
      <input
        name={name} type={type} defaultValue={defaultValue}
        placeholder={placeholder} required={required} disabled={disabled}
        className="rounded-lg px-3 py-2.5 text-sm outline-none transition-all"
        style={{
          background: "var(--bg-surface)", border: "1px solid var(--border)",
          color: "var(--text)", opacity: disabled ? 0.5 : 1,
        }}
        onFocus={(e) => { if (!disabled) (e.target as HTMLInputElement).style.borderColor = "var(--primary)"; }}
        onBlur={(e)  => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
      />
    </div>
  );
}

/* ── Status banner ───────────────────────────────────────── */
function StatusBanner({ type, msg }: { type: "success" | "error"; msg: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg px-4 py-3 text-sm"
      style={{
        background: type === "success" ? "rgba(0,214,143,0.1)" : "rgba(255,77,106,0.1)",
        border:     `1px solid ${type === "success" ? "rgba(0,214,143,0.2)" : "rgba(255,77,106,0.2)"}`,
        color:      type === "success" ? "var(--success)" : "var(--danger)",
      }}>
      {type === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
      {msg}
    </div>
  );
}

/* ── Workspace tab ───────────────────────────────────────── */
function WorkspaceTab({ settings, isAdmin }: { settings: Settings; isAdmin: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await updateWorkspaceSettings(fd);
        setStatus({ type: "success", msg: "Workspace settings saved." });
      } catch (err: unknown) {
        setStatus({ type: "error", msg: err instanceof Error ? err.message : "Save failed" });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {status && <StatusBanner type={status.type} msg={status.msg} />}
      <Input label="Site Name"    name="siteName"    defaultValue={settings.siteName}    required disabled={!isAdmin} />
      <Input label="Description"  name="description" defaultValue={settings.description} placeholder="Short description of your workspace" disabled={!isAdmin} />
      <Input label="Logo URL"     name="logoUrl"     defaultValue={settings.logoUrl}     placeholder="https://example.com/logo.png" disabled={!isAdmin} />

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>Timezone</label>
        <select
          name="timezone"
          defaultValue={settings.timezone}
          disabled={!isAdmin}
          className="rounded-lg px-3 py-2.5 text-sm outline-none"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)", opacity: isAdmin ? 1 : 0.5 }}
        >
          {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
        </select>
      </div>

      {isAdmin && (
        <div className="flex justify-end pt-2">
          <button
            type="submit" disabled={isPending}
            className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
            style={{ background: "var(--primary)", color: "var(--text-inverse)" }}
          >
            {isPending && <Loader2 size={14} className="animate-spin" />}
            {isPending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      )}

      {!isAdmin && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Only admins can edit workspace settings.
        </p>
      )}
    </form>
  );
}

/* ── Account tab ─────────────────────────────────────────── */
function AccountTab({ user }: { user: UserInfo }) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await updateAccount(user.id, fd);
        setStatus({ type: "success", msg: "Account updated. Changes take effect on next login." });
      } catch (err: unknown) {
        setStatus({ type: "error", msg: err instanceof Error ? err.message : "Update failed" });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {status && <StatusBanner type={status.type} msg={status.msg} />}

      <Input label="Display Name" name="name"  defaultValue={user.name}  required />
      <Input label="Email"        name="email" defaultValue={user.email} disabled />

      <div className="border-t pt-4 flex flex-col gap-4" style={{ borderColor: "var(--border)" }}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Change Password
        </p>
        <Input label="Current Password" name="curPassword" type="password" placeholder="••••••••" />
        <Input label="New Password"     name="newPassword" type="password" placeholder="Min 6 characters" />
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit" disabled={isPending}
          className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
          style={{ background: "var(--primary)", color: "var(--text-inverse)" }}
        >
          {isPending && <Loader2 size={14} className="animate-spin" />}
          {isPending ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

/* ── GitHub Sync tab ─────────────────────────────────────── */
function GitHubSyncTab({
  gitIntegration,
  isAdmin,
  hasOAuthConfigured,
}: {
  gitIntegration: GitInfo;
  isAdmin: boolean;
  hasOAuthConfigured: boolean;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const syncStatus = searchParams.get("sync");
  const errorMsg = searchParams.get("msg");

  const [enabled, setEnabled] = useState(gitIntegration.enabled);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // States for testing connection
  const [owner, setOwner] = useState(gitIntegration.owner);
  const [repo, setRepo] = useState(gitIntegration.repo);
  const [branch, setBranch] = useState(gitIntegration.branch);
  const [accessToken, setAccessToken] = useState(gitIntegration.accessToken);
  const [configPath, setConfigPath] = useState(gitIntegration.configPath);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);

  // Webhook states
  const [webhookUrl, setWebhookUrl] = useState(gitIntegration.webhookUrl ?? "");
  const [webhookEnabled, setWebhookEnabled] = useState(gitIntegration.webhookEnabled ?? false);
  const [webhookStatus, setWebhookStatus] = useState(gitIntegration.webhookStatus ?? "idle");
  const [lastTriggered, setLastTriggered] = useState(gitIntegration.lastTriggered);
  const [triggeringWebhook, setTriggeringWebhook] = useState(false);

  // Automated connection states
  const [gitToken, setGitToken] = useState(gitIntegration.accessToken ?? "");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [reposList, setReposList] = useState<any[]>([]);
  const [fetchingRepos, setFetchingRepos] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deployingRepo, setDeployingRepo] = useState<string | null>(null);
  const [deployStep, setDeployStep] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // OAuth & custom connection options states
  const [showPATInput, setShowPATInput] = useState(false);
  const [showOAuthGuide, setShowOAuthGuide] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [loadingOAuth, setLoadingOAuth] = useState(false);

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  }

  async function handleLinkGitHubAccount() {
    if (!hasOAuthConfigured) {
      setShowOAuthGuide(!showOAuthGuide);
      return;
    }

    setLoadingOAuth(true);
    setStatus(null);
    try {
      const res = await getGitHubOAuthUrl();
      if (res.success && res.url) {
        window.location.href = res.url;
      } else {
        setStatus({ type: "error", msg: res.msg || "Failed to generate OAuth URL" });
      }
    } catch (err: unknown) {
      setStatus({ type: "error", msg: err instanceof Error ? err.message : "OAuth redirection failed" });
    } finally {
      setLoadingOAuth(false);
    }
  }

  // Effect to automatically fetch repositories if we have a valid, saved token
  useEffect(() => {
    if (gitIntegration.accessToken && gitIntegration.accessToken !== "••••••••") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGitToken(gitIntegration.accessToken);
    }
  }, [gitIntegration.accessToken]);

  // Effect to listen for OAuth callback success/error query params
  useEffect(() => {
    if (syncStatus === "success") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus({ type: "success", msg: "Successfully authorized and linked your actual GitHub account!" });
      window.history.replaceState({}, "", "/settings");
      
      // Auto-trigger loading repositories since the account is now connected!
      startTransition(async () => {
        try {
          setFetchingRepos(true);
          // Wait a brief moment for database sync to register completely
          await new Promise((resolve) => setTimeout(resolve, 300));
          const fetched = await fetchUserRepos(""); // empty token triggers using saved token
          setReposList(fetched);
        } catch (err) {
          console.error("Auto fetch repos failed:", err);
        } finally {
          setFetchingRepos(false);
        }
      });
      
      router.refresh();
    } else if (syncStatus === "error") {
      setStatus({ type: "error", msg: errorMsg || "Failed to link your GitHub account." });
      window.history.replaceState({}, "", "/settings");
    }
  }, [syncStatus, errorMsg, router]);

  async function handleFetchRepos() {
    setFetchingRepos(true);
    setStatus(null);
    try {
      const fetched = await fetchUserRepos(gitToken);
      setReposList(fetched);
    } catch (err: unknown) {
      setStatus({ type: "error", msg: err instanceof Error ? err.message : "Failed to load repositories" });
    } finally {
      setFetchingRepos(false);
    }
  }

  async function handleAutoDeploy(repoOwner: string, repoName: string) {
    const fullRepoName = `${repoOwner}/${repoName}`;
    setDeployingRepo(fullRepoName);
    setDeployStep(1);
    setStatus(null);

    // Micro step progression pings
    const timer1 = setTimeout(() => setDeployStep(2), 800);
    const timer2 = setTimeout(() => setDeployStep(3), 1600);
    const timer3 = setTimeout(() => setDeployStep(4), 2400);

    try {
      const res = await autoConnectAndDeployRepo(gitToken, repoOwner, repoName);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setDeployStep(4);
      
      setOwner(repoOwner);
      setRepo(repoName);
      setBranch("main");
      setEnabled(true);
      
      setStatus({ type: "success", msg: res.msg });
      setReposList([]);
    } catch (err: unknown) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setDeployStep(0);
      setStatus({ type: "error", msg: err instanceof Error ? err.message : "Automated zero-config deployment failed" });
    } finally {
      setDeployingRepo(null);
    }
  }

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    setTestResult(null);

    const fd = new FormData();
    fd.append("enabled", String(enabled));
    fd.append("owner", owner);
    fd.append("repo", repo);
    fd.append("branch", branch);
    fd.append("configPath", configPath);
    fd.append("accessToken", accessToken);
    fd.append("webhookEnabled", String(webhookEnabled));
    fd.append("webhookUrl", webhookUrl);

    startTransition(async () => {
      try {
        await updateGitIntegration(fd);
        setStatus({ type: "success", msg: "GitHub integration settings saved successfully." });
      } catch (err: unknown) {
        setStatus({ type: "error", msg: err instanceof Error ? err.message : "Failed to save settings" });
      }
    });
  }

  async function handleTestConnection() {
    setTestResult(null);
    setStatus(null);
    if (!owner || !repo) {
      setTestResult({ success: false, msg: "Repository owner and name are required to test connection." });
      return;
    }
    setTesting(true);
    try {
      const res = await testGitConnection(owner, repo, branch, accessToken);
      setTestResult({ success: res.ok, msg: res.msg });
    } catch (err: unknown) {
      setTestResult({ success: false, msg: err instanceof Error ? err.message : "Connection failed" });
    } finally {
      setTesting(false);
    }
  }

  async function handleTriggerWebhook() {
    setTriggeringWebhook(true);
    setStatus(null);
    try {
      const res = await triggerGitWebhook();
      if (res.ok) {
        setWebhookStatus("success");
        setLastTriggered(new Date().toISOString());
        setStatus({ type: "success", msg: res.msg });
      } else {
        setWebhookStatus("failed");
        setStatus({ type: "error", msg: res.msg });
      }
    } catch (err: unknown) {
      setWebhookStatus("failed");
      setStatus({ type: "error", msg: err instanceof Error ? err.message : "Trigger failed" });
    } finally {
      setTriggeringWebhook(false);
    }
  }

  const filteredRepos = reposList.filter((r) =>
    r.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      {status && <StatusBanner type={status.type} msg={status.msg} />}

      {/* ── 1-Click Automated Setup Card ────────────────────── */}
      <div className="flex flex-col gap-4 p-5 rounded-2xl animate-fade-in relative overflow-hidden"
        style={{ background: "var(--bg-raised)", border: "1px solid var(--border-light)" }}>
        
        {/* Soft elegant gradient mesh underlay */}
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none filter blur-[80px] opacity-25"
          style={{ background: "linear-gradient(135deg, var(--primary) 0%, #00d68f 100%)" }} />

        <div>
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-emerald-400" />
            <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>1-Click Automated Connect & Deploy</h3>
          </div>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)", lineHeight: 1.5 }}>
            Link your actual GitHub account directly or connect manually using a Personal Access Token to load all your repositories, automatically create a default collections schema, push starter posts, and launch your visual CMS.
          </p>
        </div>

        {reposList.length === 0 && !deployingRepo && (
          <div className="flex flex-col gap-4 pt-1 animate-fade-in">
            {gitToken ? (
              <div className="flex flex-col gap-4 p-5 rounded-xl border animate-fade-in"
                style={{ background: "rgba(0, 214, 143, 0.02)", borderColor: "rgba(0, 214, 143, 0.15)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <GithubIcon size={14} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-emerald-400">Your GitHub account is linked!</span>
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Ready to fetch and sync repositories</span>
                    </div>
                  </div>
                  <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/25">Connected</span>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    disabled={fetchingRepos}
                    onClick={handleFetchRepos}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold border transition-all cursor-pointer bg-primary text-white"
                    style={{ background: "var(--primary)", border: "1px solid var(--primary)", color: "var(--text-inverse)" }}
                  >
                    {fetchingRepos ? <Loader2 size={12} className="animate-spin" /> : <FolderGit size={13} />}
                    {fetchingRepos ? "Loading Catalog…" : "Open Repository Catalog"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setGitToken("");
                      setAccessToken("");
                      setOwner("");
                      setRepo("");
                      setStatus(null);
                    }}
                    className="flex items-center justify-center rounded-lg px-4 py-2.5 text-xs font-semibold border transition-all cursor-pointer hover:bg-surface"
                    style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-muted)" }}
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option A: OAuth */}
                  <button
                    type="button"
                    onClick={handleLinkGitHubAccount}
                    disabled={loadingOAuth}
                    className="flex flex-col items-center justify-center gap-3.5 p-5 rounded-xl border text-center transition-all cursor-pointer hover:bg-surface group"
                    style={{
                      background: showOAuthGuide ? "var(--primary-dim)" : "var(--bg-surface)",
                      borderColor: showOAuthGuide ? "var(--primary)" : "var(--border)",
                      color: "var(--text)",
                    }}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110" 
                      style={{ background: "rgba(0, 214, 143, 0.1)" }}>
                      <GithubIcon size={20} className="text-emerald-400" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold">Link actual GitHub Account</span>
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        {hasOAuthConfigured ? "Instant 1-Click login connection" : "Register & link 1-Click OAuth app"}
                      </span>
                    </div>
                  </button>

                  {/* Option B: PAT */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowPATInput(!showPATInput);
                      setShowOAuthGuide(false);
                    }}
                    className="flex flex-col items-center justify-center gap-3.5 p-5 rounded-xl border text-center transition-all cursor-pointer hover:bg-surface group"
                    style={{
                      background: showPATInput ? "var(--primary-dim)" : "var(--bg-surface)",
                      borderColor: showPATInput ? "var(--primary)" : "var(--border)",
                      color: "var(--text)",
                    }}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110" 
                      style={{ background: "rgba(59, 130, 246, 0.1)" }}>
                      <KeyRound size={18} className="text-blue-400" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold">Use Personal Access Token</span>
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        Paste raw developer token (PAT) manually
                      </span>
                    </div>
                  </button>
                </div>

                {/* Custom OAuth app Setup Guidance Card if hasOAuthConfigured is false */}
                {!hasOAuthConfigured && showOAuthGuide && (
                  <div className="p-5 rounded-xl border animate-fade-in flex flex-col gap-4"
                    style={{ background: "var(--bg-surface)", borderColor: "var(--border-light)" }}>
                    <div className="flex items-center gap-2">
                      <HelpCircle size={15} className="text-emerald-400 animate-pulse" />
                      <span className="text-xs font-semibold animate-fade-in" style={{ color: "var(--text)" }}>Setup GitHub OAuth App in 30 Seconds</span>
                    </div>
                    
                    <div className="flex flex-col gap-3 text-xs leading-relaxed" style={{ color: "var(--text-soft)" }}>
                      <p>
                        Since this is a self-hosted CMS, you can link your actual GitHub account by registering a free OAuth App in your GitHub profile. Follow these 4 simple steps:
                      </p>
                      
                      <div className="flex flex-col gap-3.5 pl-3 border-l-2" style={{ borderColor: "var(--border)" }}>
                        <div>
                          <strong style={{ color: "var(--text)" }}>1. Open Developer Settings:</strong> Visit <a href="https://github.com/settings/developers" target="_blank" rel="noreferrer" className="text-emerald-400 hover:text-emerald-300 underline font-semibold cursor-pointer">GitHub Developer Settings</a> and click **&quot;New OAuth App&quot;**.
                        </div>
                        <div>
                          <strong style={{ color: "var(--text)" }}>2. Fill Registration Details:</strong>
                          <ul className="list-disc pl-4 mt-1.5 flex flex-col gap-1.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
                            <li>Application Name: <code className="bg-raised px-1.5 py-0.5 rounded font-mono text-emerald-400" style={{ background: "var(--bg-raised)" }}>Genesis CMS</code></li>
                            <li>Homepage URL: <code className="bg-raised px-1.5 py-0.5 rounded font-mono text-emerald-400" style={{ background: "var(--bg-raised)" }}>http://localhost:3000</code></li>
                            <li>
                              Authorization Callback URL: <code className="bg-raised px-1.5 py-0.5 rounded font-mono text-emerald-400" style={{ background: "var(--bg-raised)" }}>http://localhost:3000/api/auth/github/callback</code>
                              <button
                                type="button"
                                onClick={() => copyToClipboard("http://localhost:3000/api/auth/github/callback", "callback")}
                                className="ml-2 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border transition-all cursor-pointer hover:bg-raised"
                                style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
                              >
                                {copiedText === "callback" ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                                {copiedText === "callback" ? "Copied!" : "Copy"}
                              </button>
                            </li>
                          </ul>
                        </div>
                        <div>
                          <strong style={{ color: "var(--text)" }}>3. Copy Credentials & Update `.env`:</strong> Click &quot;Register application&quot;. Copy the generated <strong style={{ color: "var(--text)" }}>Client ID</strong> and generate a new <strong style={{ color: "var(--text)" }}>Client Secret</strong>. Paste them in your <code className="bg-raised px-1 rounded font-mono text-emerald-400" style={{ background: "var(--bg-raised)" }}>.env</code> file:
                          <div className="relative mt-2 p-3 rounded-lg font-mono text-[11px] select-all flex justify-between items-center"
                            style={{ background: "var(--bg-raised)", border: "1px solid var(--border-light)" }}>
                            <pre style={{ margin: 0, color: "var(--text)" }}>
                              {`GITHUB_CLIENT_ID="your_client_id"`}<br/>
                              {`GITHUB_CLIENT_SECRET="your_client_secret"`}
                            </pre>
                            <button
                              type="button"
                              onClick={() => copyToClipboard('GITHUB_CLIENT_ID="your_client_id"\nGITHUB_CLIENT_SECRET="your_client_secret"', "env")}
                              className="p-1.5 rounded transition-all cursor-pointer hover:bg-surface"
                              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
                            >
                              {copiedText === "env" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <strong style={{ color: "var(--text)" }}>4. Save and Restart:</strong> Save the `.env` file, stop and restart your Next.js server (<code className="bg-raised px-1 rounded">npm run dev</code>), and refresh this page. The button above will instantly launch the 1-click authorization!
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* PAT Input field toggled manually */}
                {showPATInput && (
                  <div className="flex gap-2 items-end pt-1 animate-fade-in">
                    <div className="flex-1 flex flex-col gap-1.5">
                      <label className="text-[11px] font-medium" style={{ color: "var(--text-soft)" }}>GitHub Personal Access Token (PAT)</label>
                      <input
                        type="password"
                        value={gitToken}
                        onChange={(e) => setGitToken(e.target.value)}
                        disabled={!isAdmin}
                        placeholder={gitToken ? "••••••••" : "ghp_..."}
                        className="rounded-lg px-3 py-2 text-sm outline-none transition-all font-mono"
                        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)", opacity: isAdmin ? 1 : 0.5 }}
                      />
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        disabled={fetchingRepos || !gitToken}
                        onClick={handleFetchRepos}
                        className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold border transition-all cursor-pointer bg-primary text-white"
                        style={{ background: "var(--primary)", border: "1px solid var(--primary)", color: "var(--text-inverse)" }}
                      >
                        {fetchingRepos ? <Loader2 size={12} className="animate-spin" /> : null}
                        {fetchingRepos ? "Loading repos…" : "Connect Account"}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Dynamic repository catalog grid */}
        {reposList.length > 0 && !deployingRepo && (
          <div className="flex flex-col gap-3 animate-fade-in pt-1">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-muted" style={{ color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Search repositories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg pl-9 pr-3 py-2 text-xs outline-none border"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
            </div>

            <div className="flex flex-col gap-1 max-h-60 overflow-y-auto pr-1 border rounded-xl divide-y"
              style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
              {filteredRepos.length === 0 ? (
                <p className="p-4 text-xs text-center" style={{ color: "var(--text-muted)" }}>No repositories matched search</p>
              ) : (
                filteredRepos.map((repoItem) => (
                  <div key={repoItem.id} className="flex items-center justify-between p-3 transition-all hover:bg-raised"
                    style={{ borderBottom: "1px solid var(--border-light)" }}>
                    <div className="flex items-center gap-2.5">
                      {repoItem.private ? (
                        <Lock size={12} className="text-amber-400" />
                      ) : (
                        <FolderGit size={12} className="text-blue-400" />
                      )}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>{repoItem.fullName}</span>
                        {repoItem.description && (
                          <span className="text-[10px] truncate max-w-xs" style={{ color: "var(--text-muted)" }}>{repoItem.description}</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAutoDeploy(repoItem.owner, repoItem.name)}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold border transition-all cursor-pointer hover:bg-primary-dim"
                      style={{ background: "var(--bg-raised)", color: "var(--primary)", borderColor: "var(--primary)" }}
                    >
                      Deploy <ArrowRight size={10} />
                    </button>
                  </div>
                ))
              )}
            </div>
            
            <div className="flex justify-between items-center text-[10px]" style={{ color: "var(--text-muted)" }}>
              <span>Loaded {reposList.length} repositories.</span>
              <button type="button" onClick={() => setReposList([])} className="hover:underline cursor-pointer">Change Token</button>
            </div>
          </div>
        )}

        {/* Incremental micro steps loader during deploy */}
        {deployingRepo && (
          <div className="flex flex-col items-center justify-center p-6 gap-4 animate-fade-in text-center">
            <Loader2 size={32} className="animate-spin text-primary" style={{ color: "var(--primary)" }} />
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>Deploying {deployingRepo}</p>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                {deployStep === 1 && "🔍 Analyzing GitHub repository structures..."}
                {deployStep === 2 && "🏗️ Creating visual collections config..."}
                {deployStep === 3 && "🚀 Pushing welcome starter post content..."}
                {deployStep === 4 && "🎉 Success! Launching visual collections database!"}
              </p>
            </div>
            
            {/* Step badges */}
            <div className="flex gap-1.5 mt-2">
              {[1, 2, 3, 4].map((stepNum) => (
                <div
                  key={stepNum}
                  className="w-8 h-1.5 rounded-full transition-all duration-300"
                  style={{
                    background: deployStep >= stepNum ? "var(--primary)" : "var(--border-light)",
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-5">
        {/* Connection status header */}
        {owner && repo && (
          <div className="flex items-center justify-between p-4 rounded-xl border animate-fade-in"
            style={{ background: "var(--bg-surface)", borderColor: "var(--border-light)" }}>
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>Connected to GitHub Repo</span>
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{owner}/{repo} ({branch} branch)</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={fetchingRepos}
                onClick={handleFetchRepos}
                className="text-xs font-medium px-3 py-1.5 border rounded-lg transition-all flex items-center gap-1.5"
                style={{
                  background: "var(--bg-overlay)",
                  borderColor: "var(--border)",
                  color: "var(--text-soft)",
                }}
              >
                {fetchingRepos ? <Loader2 size={11} className="animate-spin" /> : <FolderGit size={11} />}
                Change Repo
              </button>
              <button
                type="button"
                onClick={() => {
                  setEnabled(!enabled);
                  setStatus({ type: "success", msg: `GitHub Sync successfully ${!enabled ? "enabled" : "disabled"}.` });
                }}
                className="text-xs font-medium px-3 py-1.5 border rounded-lg transition-all"
                style={{
                  background: enabled ? "var(--primary-dim)" : "var(--bg-overlay)",
                  borderColor: enabled ? "var(--primary)" : "var(--border)",
                  color: enabled ? "var(--primary)" : "var(--text-soft)",
                }}
              >
                {enabled ? "Sync Active" : "Sync Disabled"}
              </button>
            </div>
          </div>
        )}

        {/* ── Collapsible Advanced settings Toggle ─────────────── */}
        <div className="border rounded-xl overflow-hidden" style={{ borderColor: "var(--border)" }}>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between p-4 text-xs font-semibold transition-all hover:bg-raised"
            style={{ background: "var(--bg-surface)", color: "var(--text-soft)" }}
          >
            <span>Advanced Configuration (Manual Connection)</span>
            <span className="text-[10px]">{showAdvanced ? "Hide Details ▴" : "Show Details ▾"}</span>
          </button>

          {showAdvanced && (
            <div className="p-5 border-t flex flex-col gap-5 animate-fade-in"
              style={{ background: "var(--bg-raised)", borderColor: "var(--border)" }}>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>
                    Repository Owner {enabled && <span style={{ color: "var(--danger)" }}>*</span>}
                  </label>
                  <input
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    required={enabled}
                    disabled={!isAdmin}
                    placeholder="e.g. facebook"
                    className="rounded-lg px-3 py-2.5 text-sm outline-none transition-all"
                    style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)", opacity: isAdmin ? 1 : 0.5 }}
                    onFocus={(e) => { if (isAdmin) e.target.style.borderColor = "var(--primary)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>
                    Repository Name {enabled && <span style={{ color: "var(--danger)" }}>*</span>}
                  </label>
                  <input
                    value={repo}
                    onChange={(e) => setRepo(e.target.value)}
                    required={enabled}
                    disabled={!isAdmin}
                    placeholder="e.g. react"
                    className="rounded-lg px-3 py-2.5 text-sm outline-none transition-all"
                    style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)", opacity: isAdmin ? 1 : 0.5 }}
                    onFocus={(e) => { if (isAdmin) e.target.style.borderColor = "var(--primary)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>Target Branch</label>
                  <input
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    disabled={!isAdmin}
                    placeholder="main"
                    className="rounded-lg px-3 py-2.5 text-sm outline-none transition-all"
                    style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)", opacity: isAdmin ? 1 : 0.5 }}
                    onFocus={(e) => { if (isAdmin) e.target.style.borderColor = "var(--primary)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>Config File Path</label>
                  <input
                    value={configPath}
                    onChange={(e) => setConfigPath(e.target.value)}
                    disabled={!isAdmin}
                    placeholder=".genesis/config.json"
                    className="rounded-lg px-3 py-2.5 text-sm outline-none transition-all"
                    style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)", opacity: isAdmin ? 1 : 0.5 }}
                    onFocus={(e) => { if (isAdmin) e.target.style.borderColor = "var(--primary)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>
                  GitHub Personal Access Token (PAT)
                </label>
                <input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  disabled={!isAdmin}
                  placeholder={accessToken ? "••••••••" : "ghp_..."}
                  className="rounded-lg px-3 py-2.5 text-sm outline-none transition-all font-mono"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)", opacity: isAdmin ? 1 : 0.5 }}
                  onFocus={(e) => { if (isAdmin) e.target.style.borderColor = "var(--primary)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
                />
              </div>

              {testResult && (
                <div className="flex items-center gap-2.5 rounded-lg px-4 py-3 text-sm transition-all"
                  style={{
                    background: testResult.success ? "rgba(0,214,143,0.1)" : "rgba(255,77,106,0.1)",
                    border:     `1px solid ${testResult.success ? "rgba(0,214,143,0.2)" : "rgba(255,77,106,0.2)"}`,
                    color:      testResult.success ? "var(--success)" : "var(--danger)",
                  }}>
                  <CheckCircle2 size={14} />
                  {testResult.msg}
                </div>
              )}

              {isAdmin && (
                <div className="flex items-center justify-between border-t pt-4" style={{ borderColor: "var(--border)" }}>
                  <button
                    type="button"
                    disabled={testing || !owner || !repo}
                    onClick={handleTestConnection}
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold border transition-all disabled:opacity-40 cursor-pointer"
                    style={{ background: "var(--bg-overlay)", color: "var(--text-soft)", borderColor: "var(--border)" }}
                  >
                    {testing && <Loader2 size={12} className="animate-spin" />}
                    {testing ? "Testing…" : "Test Connection"}
                  </button>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50 cursor-pointer"
                    style={{ background: "var(--primary)", color: "var(--text-inverse)" }}
                  >
                    {isPending && <Loader2 size={14} className="animate-spin" />}
                    {isPending ? "Saving…" : "Save Settings"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Webhook Trigger Section ──────────────────────────── */}
        <div className="border-t pt-5 flex flex-col gap-4" style={{ borderColor: "var(--border)" }}>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Deploy Webhooks</h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Automatically trigger deployments on external hosting providers (like Vercel, Netlify, or custom CI) whenever you save changes.
            </p>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl"
            style={{ background: "var(--bg-raised)", border: "1px solid var(--border-light)" }}>
            <div className="flex flex-col gap-0.5">
              <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>Enable Deploy Webhook</p>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                Fires a POST trigger automatically after visual commits.
              </p>
            </div>
            <button
              type="button"
              disabled={!isAdmin}
              onClick={() => setWebhookEnabled(!webhookEnabled)}
              className="relative flex-shrink-0 w-10 h-5 rounded-full transition-all duration-200 disabled:opacity-50 cursor-pointer"
              style={{ background: webhookEnabled ? "var(--primary)" : "var(--border-light)" }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200"
                style={{
                  background: "#fff",
                  left:       webhookEnabled ? "calc(100% - 18px)" : "2px",
                  boxShadow:  "0 1px 3px rgba(0,0,0,0.3)",
                }}
              />
            </button>
          </div>

          {webhookEnabled && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>
                  Webhook Deploy URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    disabled={!isAdmin}
                    placeholder="https://api.vercel.com/v1/integrations/deploy/..."
                    className="rounded-lg px-3 py-2.5 text-sm outline-none transition-all flex-1"
                    style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)", opacity: isAdmin ? 1 : 0.5 }}
                    onFocus={(e) => { if (isAdmin) e.target.style.borderColor = "var(--primary)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
                  />
                  {isAdmin && (
                    <button
                      type="button"
                      disabled={triggeringWebhook || !webhookUrl}
                      onClick={handleTriggerWebhook}
                      className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold border transition-all disabled:opacity-40 cursor-pointer shrink-0"
                      style={{ background: "var(--bg-overlay)", color: "var(--text-soft)", borderColor: "var(--border)" }}
                    >
                      {triggeringWebhook ? <Loader2 size={12} className="animate-spin" /> : null}
                      {triggeringWebhook ? "Triggering…" : "Trigger Build"}
                    </button>
                  )}
                </div>
              </div>

              {/* Webhook Status Info */}
              <div className="flex items-center justify-between p-3 rounded-lg text-xs"
                style={{ background: "var(--bg-raised)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{
                    background: webhookStatus === "success" ? "var(--success)"
                              : webhookStatus === "failed" ? "var(--danger)"
                              : webhookStatus === "triggering" ? "var(--warning)"
                              : "var(--text-muted)"
                  }} />
                  <span style={{ color: "var(--text)" }}>
                    Status: <strong className="capitalize">{webhookStatus}</strong>
                  </span>
                </div>
                {lastTriggered && (
                  <span style={{ color: "var(--text-muted)" }}>
                    Last Triggered: {new Date(lastTriggered).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

/* ── Appearance tab ──────────────────────────────────────── */
function AppearanceTab() {
  const { theme, toggleTheme } = useUIStore();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-medium mb-1" style={{ color: "var(--text)" }}>Theme</p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Choose how the dashboard looks. Saved locally in your browser.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {THEMES.map(({ value, label, desc }) => (
          <button
            key={value}
            type="button"
            onClick={() => { if (theme !== value) toggleTheme(); }}
            className="flex flex-col items-start gap-1 rounded-xl p-4 text-left transition-all cursor-pointer"
            style={{
              background: theme === value ? "var(--primary-dim)" : "var(--bg-surface)",
              border:     `2px solid ${theme === value ? "var(--primary)" : "var(--border)"}`,
            }}
          >
            {/* Mini preview */}
            <div className="w-full h-12 rounded-lg mb-2 overflow-hidden flex"
              style={{ background: value === "dark" ? "#07091A" : "#F4F5F7", border: "1px solid var(--border)" }}>
              <div className="w-8 h-full" style={{ background: value === "dark" ? "#0D1025" : "#E8E9ED" }} />
              <div className="flex-1 p-1.5 flex flex-col gap-1">
                <div className="h-1.5 w-3/4 rounded-full" style={{ background: value === "dark" ? "#1E2235" : "#D1D5DB" }} />
                <div className="h-1.5 w-1/2 rounded-full" style={{ background: value === "dark" ? "#1E2235" : "#D1D5DB" }} />
              </div>
            </div>
            <span className="text-sm font-semibold" style={{ color: theme === value ? "var(--primary)" : "var(--text)" }}>
              {label}
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────── */
const TABS = [
  { id: "workspace",  label: "Workspace", icon: Building2  },
  { id: "account",    label: "Account",   icon: User       },
  { id: "github",     label: "GitHub Sync", icon: GitBranch },
  { id: "appearance", label: "Appearance",icon: Palette    },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function SettingsClient({
  settings,
  user,
  gitIntegration,
  hasOAuthConfigured,
}: {
  settings: Settings;
  user: UserInfo;
  gitIntegration: GitInfo;
  hasOAuthConfigured: boolean;
}) {
  const [tab, setTab] = useState<TabId>("workspace");
  const isAdmin = user.role === "admin";

  return (
    <div className="p-6 max-w-2xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Settings</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          Manage your workspace and account preferences.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1 rounded-xl"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex items-center gap-2 flex-1 justify-center rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer"
            style={{
              background: tab === id ? "var(--bg-raised)" : "transparent",
              color:      tab === id ? "var(--text)"      : "var(--text-muted)",
              boxShadow:  tab === id ? "var(--shadow-sm)" : "none",
            }}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="rounded-xl p-6 animate-fade-in"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        {tab === "workspace"  && <WorkspaceTab  settings={settings} isAdmin={isAdmin} />}
        {tab === "account"    && <AccountTab    user={user} />}
        {tab === "github"     && <GitHubSyncTab gitIntegration={gitIntegration} isAdmin={isAdmin} hasOAuthConfigured={hasOAuthConfigured} />}
        {tab === "appearance" && <AppearanceTab />}
      </div>
    </div>
  );
}


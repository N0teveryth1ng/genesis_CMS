"use client";

import { useState, useEffect, useTransition, useRef, useCallback } from "react";
import Link from "next/link";
import { getPages } from "@/lib/actions/pages";
import { getSandboxStatus, deploySandboxRepository, stopSandboxServer, clearSandboxLogs } from "@/lib/actions/sandbox";
import { triggerGitWebhook } from "@/lib/actions/git";
import {
  Laptop, Tablet, Smartphone, ExternalLink,
  RefreshCw, Loader2, CheckCircle2, AlertCircle, LayoutTemplate,
  Zap, Play, Square, Terminal, ChevronDown, ChevronUp,
} from "lucide-react";
import type { Page } from "@prisma/client";
import SiteContentEditor from "./_components/SiteContentEditor";
import PageBlocksEditor from "./_components/PageBlocksEditor";

type Device  = "desktop" | "tablet" | "mobile";
type TabMode = "genesis" | "repo";

const DEVICE_WIDTH: Record<Device, string> = {
  desktop: "100%", tablet: "768px", mobile: "375px",
};

export default function PreviewPage() {
  const [tab, setTab]               = useState<TabMode>("genesis");
  const [pages, setPages]           = useState<Page[]>([]);
  const [activePage, setActivePage] = useState<Page | null>(null);
  const [device, setDevice]         = useState<Device>("desktop");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sandbox, setSandbox]       = useState<any>(null);
  const [showLogs, setShowLogs]     = useState(false);
  const [webhookRes, setWebhookRes] = useState<{ ok: boolean; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const logsEndRef  = useRef<HTMLDivElement>(null);
  const iframeRef   = useRef<HTMLIFrameElement>(null);
  const repoIframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    getPages().then((all) => {
      const pub = all.filter((p) => p.status === "published");
      setPages(pub);
      if (pub.length > 0) setActivePage(pub[0]);
    });
    fetchSandbox();
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (sandbox?.sandboxStatus === "cloning" || sandbox?.sandboxStatus === "building") {
        fetchSandbox();
      }
    }, 3000);
    return () => clearInterval(id);
  }, [sandbox?.sandboxStatus]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sandbox?.sandboxLogs]);

  async function fetchSandbox() {
    const data = await getSandboxStatus();
    setSandbox(data);
  }

  const reloadRepoIframe = useCallback(() => {
    if (repoIframeRef.current) repoIframeRef.current.src = repoIframeRef.current.src;
  }, []);

  function handleLaunch() {
    startTransition(async () => { await deploySandboxRepository(); await fetchSandbox(); });
  }
  function handleStop() {
    startTransition(async () => { await stopSandboxServer(); await fetchSandbox(); });
  }
  function handleClearLogs() {
    startTransition(async () => { await clearSandboxLogs(); await fetchSandbox(); });
  }
  function handleDeploy() {
    setWebhookRes(null);
    startTransition(async () => {
      const r = await triggerGitWebhook();
      setWebhookRes(r);
      setTimeout(() => setWebhookRes(null), 4000);
    });
  }

  const sandboxRunning = sandbox?.sandboxStatus === "running";
  const sandboxBusy    = sandbox?.sandboxStatus === "cloning" || sandbox?.sandboxStatus === "building";
  const sandboxUrl     = sandboxRunning
    ? `/api/preview-proxy?port=${sandbox.sandboxPort ?? 4000}&path=/`
    : null;
  const genesisUrl     = activePage ? `/site/${activePage.slug}` : null;

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 56px)" }}>

      {/* ── Top toolbar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-5 py-2.5 shrink-0"
        style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" }}>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 rounded-lg p-0.5"
          style={{ background: "var(--bg-raised)", border: "1px solid var(--border)" }}>
          {(["genesis", "repo"] as TabMode[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
              style={{
                background: tab === t ? "var(--bg-overlay)" : "transparent",
                color:      tab === t ? "var(--primary)"    : "var(--text-muted)",
              }}>
              {t === "genesis" ? "Genesis Pages" : "Repo Preview"}
            </button>
          ))}
        </div>

        {/* Device switcher */}
        <div className="flex items-center gap-1 rounded-lg p-0.5"
          style={{ background: "var(--bg-raised)", border: "1px solid var(--border)" }}>
          {(["desktop", "tablet", "mobile"] as Device[]).map((d) => {
            const Icon = d === "desktop" ? Laptop : d === "tablet" ? Tablet : Smartphone;
            return (
              <button key={d} onClick={() => setDevice(d)} title={d}
                className="p-1.5 rounded-md transition-all"
                style={{
                  background: device === d ? "var(--bg-overlay)" : "transparent",
                  color:      device === d ? "var(--primary)"    : "var(--text-muted)",
                }}>
                <Icon size={14} />
              </button>
            );
          })}
        </div>

        {/* URL bar */}
        <div className="flex-1 max-w-sm mx-auto text-[11px] text-center px-3 py-1.5 rounded-lg truncate"
          style={{ background: "var(--bg-raised)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
          {tab === "genesis" && activePage
            ? `localhost:3000/site/${activePage.slug}`
            : sandboxRunning
            ? `localhost:${sandbox?.sandboxPort ?? 4000}`
            : "—"}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {tab === "repo" && (
            <>
              {!sandboxRunning && !sandboxBusy && (
                <button onClick={handleLaunch} disabled={isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: "var(--primary)", color: "var(--text-inverse)" }}>
                  {isPending ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                  Launch
                </button>
              )}
              {sandboxBusy && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: "rgba(255,184,0,0.12)", color: "#FFB800" }}>
                  <Loader2 size={12} className="animate-spin" />
                  {sandbox.sandboxStatus === "cloning" ? "Cloning…" : "Building…"}
                </span>
              )}
              {sandboxRunning && (
                <button onClick={handleStop} disabled={isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: "rgba(255,77,106,0.12)", color: "var(--danger)" }}>
                  <Square size={12} /> Stop
                </button>
              )}
              <button onClick={handleLaunch} disabled={isPending || sandboxBusy}
                title="Re-pull & restart"
                className="p-1.5 rounded-lg"
                style={{ background: "var(--bg-raised)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                <RefreshCw size={13} className={sandboxBusy ? "animate-spin" : ""} />
              </button>
            </>
          )}
          {sandbox?.webhookUrl && (
            <button onClick={handleDeploy} disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: "var(--bg-raised)", border: "1px solid var(--border)", color: "var(--text-soft)" }}>
              <Zap size={12} /> Deploy
            </button>
          )}
          {tab === "genesis" && genesisUrl && (
            <a href={genesisUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: "var(--primary)", color: "var(--text-inverse)" }}>
              <ExternalLink size={12} /> Open
            </a>
          )}
          {tab === "repo" && sandboxRunning && (
            <a href={`http://localhost:${sandbox?.sandboxPort ?? 4000}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: "var(--primary)", color: "var(--text-inverse)" }}>
              <ExternalLink size={12} /> Open
            </a>
          )}
        </div>
      </div>

      {/* Webhook feedback */}
      {webhookRes && (
        <div className="flex items-center gap-2 px-5 py-2 text-xs font-medium shrink-0"
          style={{
            background:   webhookRes.ok ? "rgba(0,214,143,0.1)" : "rgba(255,77,106,0.1)",
            color:        webhookRes.ok ? "var(--success)"       : "var(--danger)",
            borderBottom: "1px solid var(--border)",
          }}>
          {webhookRes.ok ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
          {webhookRes.msg}
        </div>
      )}

      {/* ── Main area ────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* ── GENESIS PAGES TAB ──────────────────────────────────── */}
        {tab === "genesis" && (
          <>
            {/* Left: block editor panel */}
            <div className="w-72 shrink-0 flex flex-col overflow-hidden"
              style={{ background: "var(--bg-surface)", borderRight: "1px solid var(--border)" }}>
              <PageBlocksEditor
                key={activePage?.id ?? "none"}
                pages={pages}
                activePage={activePage}
                onPageChange={(p) => setActivePage(p)}
                iframeRef={iframeRef}
                onSaved={() => {
                  // brief delay so revalidation completes, then reload iframe
                  setTimeout(() => {
                    if (iframeRef.current) iframeRef.current.src = iframeRef.current.src;
                  }, 300);
                }}
              />
            </div>

            {/* Right: Genesis iframe */}
            <div className="flex-1 flex items-start justify-center overflow-auto p-5"
              style={{ background: "#f1f5f9" }}>
              {genesisUrl ? (
                <IframeShell
                  src={genesisUrl}
                  width={DEVICE_WIDTH[device]}
                  label={`localhost:3000${genesisUrl}`}
                  iframeRef={iframeRef}
                />
              ) : (
                <EmptyState icon={<LayoutTemplate size={28} />}
                  message="No published pages yet."
                  action={<Link href="/pages" className="text-xs font-semibold px-4 py-2 rounded-lg"
                    style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
                    Go to Pages →
                  </Link>}
                />
              )}
            </div>
          </>
        )}

        {/* ── REPO PREVIEW TAB ───────────────────────────────────── */}
        {tab === "repo" && (
          <>
            {/* Left: click-to-edit visual editor panel */}
            <div className="w-72 shrink-0 flex flex-col overflow-hidden"
              style={{ background: "var(--bg-surface)", borderRight: "1px solid var(--border)" }}>
              <SiteContentEditor
                iframeRef={repoIframeRef}
                repoKey={sandbox?.owner && sandbox?.repo ? `${sandbox.owner}/${sandbox.repo}` : "unknown/unknown"}
              />
            </div>

            {/* Right: iframe + console logs */}
            <div className="flex-1 flex flex-col min-h-0">

              {/* iframe area */}
              <div className="flex-1 flex items-start justify-center overflow-auto p-5 min-h-0"
                style={{ background: "#f1f5f9" }}>
                {sandboxUrl ? (
                  <IframeShell
                    src={sandboxUrl}
                    width={DEVICE_WIDTH[device]}
                    label={`localhost:${sandbox?.sandboxPort ?? 4000}`}
                    iframeRef={repoIframeRef}
                    onRefresh={() => reloadRepoIframe()}
                  />
                ) : (
                  <EmptyState
                    icon={<Play size={24} />}
                    message={sandbox?.repo
                      ? `${sandbox.owner}/${sandbox.repo}`
                      : "No repo connected"}
                    sub={sandbox?.repo
                      ? "Click Launch to pull the repo and start it locally."
                      : "Connect a GitHub repo in Settings → GitHub Sync first."}
                    action={sandbox?.repo ? (
                      <button onClick={handleLaunch} disabled={isPending}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold"
                        style={{ background: "var(--primary)", color: "var(--text-inverse)" }}>
                        <Play size={14} /> Launch Repo
                      </button>
                    ) : null}
                  />
                )}
              </div>

              {/* Console logs */}
              <div className="shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
                <button onClick={() => setShowLogs((s) => !s)}
                  className="flex items-center gap-2 w-full px-5 py-2 text-xs font-semibold"
                  style={{ background: "#0d1321", color: "#94a3b8" }}>
                  <Terminal size={12} className="text-emerald-400" />
                  Console Logs
                  {showLogs ? <ChevronDown size={12} className="ml-auto" /> : <ChevronUp size={12} className="ml-auto" />}
                  {sandboxBusy && <Loader2 size={11} className="animate-spin ml-1 text-amber-400" />}
                  {sandboxRunning && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                </button>

                {showLogs && (
                  <div className="flex flex-col" style={{ background: "#090d16", height: 180 }}>
                    <div className="flex items-center justify-end px-4 py-1 border-b"
                      style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                      <button onClick={handleClearLogs}
                        className="text-[10px] px-2 py-0.5 rounded border font-semibold"
                        style={{ color: "#64748b", borderColor: "rgba(255,255,255,0.08)" }}>
                        Clear
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed"
                      style={{ color: "#94a3b8" }}>
                      {sandbox?.sandboxLogs
                        ? sandbox.sandboxLogs.split("\n").map((line: string, i: number) => (
                          <div key={i} className="whitespace-pre-wrap" style={{
                            color: line.includes("🟢") || line.includes("✅") ? "#34d399"
                                 : line.includes("❌") || line.includes("error") ? "#f87171"
                                 : line.includes("⚠️") ? "#fbbf24"
                                 : "#94a3b8",
                          }}>{line}</div>
                        ))
                        : <span style={{ color: "#475569" }}>No logs yet. Click Launch to start.</span>
                      }
                      <div ref={logsEndRef} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Shared sub-components ─────────────────────────────────────── */

function IframeShell({
  src, width, label, iframeRef, onRefresh,
}: {
  src: string;
  width: string;
  label: string;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  onRefresh?: () => void;
}) {
  function refresh() {
    if (onRefresh) { onRefresh(); return; }
    if (iframeRef.current) iframeRef.current.src = iframeRef.current.src;
  }

  return (
    <div className="rounded-xl overflow-hidden shadow-2xl h-full transition-all duration-300"
      style={{ width, minHeight: 400, border: "1px solid #e2e8f0", background: "#fff" }}>
      <div className="flex items-center gap-1.5 px-4 py-2 border-b"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
        <div className="flex-1 max-w-xs mx-auto text-[10px] text-center px-2 py-0.5 rounded truncate"
          style={{ background: "var(--bg-overlay)", color: "var(--text-muted)" }}>
          {label}
        </div>
        <button onClick={refresh} className="p-1 rounded" style={{ color: "var(--text-muted)" }}>
          <RefreshCw size={11} />
        </button>
      </div>
      <iframe
        ref={iframeRef}
        src={src}
        title="Preview"
        className="w-full border-0"
        style={{ height: "calc(100% - 36px)" }}
      />
    </div>
  );
}

function EmptyState({
  icon, message, sub, action,
}: {
  icon: React.ReactNode;
  message: string;
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center max-w-sm">
      <div className="w-14 h-14 rounded-xl flex items-center justify-center"
        style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{message}</p>
        {sub && <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

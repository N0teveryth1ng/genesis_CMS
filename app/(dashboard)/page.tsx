import type { Metadata } from "next";
import Link from "next/link";
import {
  Database, FolderOpen, Users, FileText,
  ArrowUpRight, Plus, Edit2, Trash2, Globe, Key,
} from "lucide-react";
import { getCollectionStats } from "@/lib/actions/collections";
import { getFileCount } from "@/lib/actions/files";
import { getAuditLogs } from "@/lib/actions/audit";

export const metadata: Metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

/* ── Stat card ───────────────────────────────────────────── */
function StatCard({
  label, value, icon: Icon, color, href,
}: {
  label: string; value: number | string;
  icon: React.ElementType; color: string; href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl p-5 flex items-center justify-between transition-opacity duration-150 hover:opacity-80"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
    >
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{label}</p>
        <p className="text-2xl font-bold" style={{ color: "var(--text)" }}>{value}</p>
      </div>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: `${color}18`, color }}>
        <Icon size={20} />
      </div>
    </Link>
  );
}

/* ── Action icon ─────────────────────────────────────────── */
const ACTION_META: Record<string, { Icon: React.ElementType; color: string; label: string }> = {
  create: { Icon: Plus,   color: "var(--success)", label: "created" },
  update: { Icon: Edit2,  color: "var(--info)",    label: "updated" },
  delete: { Icon: Trash2, color: "var(--danger)",  label: "deleted" },
};

const RESOURCE_ICONS: Record<string, React.ElementType> = {
  record: FileText, collection: Database, user: Users,
  webhook: Globe,  api_key: Key,         file: FolderOpen,
};

function parseMeta(raw: string | null): Record<string, unknown> {
  try { return raw ? JSON.parse(raw) as Record<string, unknown> : {}; } catch { return {}; }
}

function buildDesc(resource: string, meta: Record<string, unknown>): string {
  if (resource === "record")     return `in ${String(meta.collectionName ?? "unknown")}`;
  if (resource === "collection") return String(meta.label ?? meta.name ?? "");
  if (resource === "user")       return String(meta.email ?? meta.name ?? "");
  if (resource === "webhook")    return String(meta.name ?? "");
  return "";
}

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60)     return `${diff}s ago`;
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default async function OverviewPage() {
  const [stats, fileCount, { logs }] = await Promise.all([
    getCollectionStats(),
    getFileCount(),
    getAuditLogs(1, 8),
  ]);

  const STATS = [
    { label: "Collections", value: stats.collections, icon: Database,  color: "#00C8F8", href: "/collections" },
    { label: "Records",     value: stats.records,     icon: FileText,  color: "#7B61FF", href: "/collections" },
    { label: "Files",       value: fileCount,          icon: FolderOpen,color: "#A855F7", href: "/files"       },
    { label: "Users",       value: stats.users,        icon: Users,     color: "#00D68F", href: "/users"       },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col gap-8">
      {/* Hero */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Overview</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-soft)" }}>
            Here&apos;s what&apos;s happening in your workspace.
          </p>
        </div>
        <Link
          href="/collections"
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
          style={{ background: "var(--primary)", color: "var(--text-inverse)" }}
        >
          New Collection <ArrowUpRight size={14} />
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Recent Activity */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Recent Activity</h2>
          <Link href="/audit" className="text-xs" style={{ color: "var(--primary)" }}>
            View all →
          </Link>
        </div>

        <div className="rounded-xl overflow-hidden"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <p className="text-sm font-medium" style={{ color: "var(--text-soft)" }}>No activity yet</p>
              <p className="text-xs text-center max-w-xs" style={{ color: "var(--text-muted)" }}>
                Events appear here as you create, update, and delete content.
              </p>
            </div>
          ) : (
            logs.map((log, i) => {
              const am      = ACTION_META[log.action] ?? ACTION_META.update;
              const ResIcon = RESOURCE_ICONS[log.resource] ?? FileText;
              const meta    = parseMeta(log.meta);
              const desc    = buildDesc(log.resource, meta);
              return (
                <div
                  key={log.id}
                  className="flex items-center gap-3 px-5 py-3"
                  style={{ borderBottom: i < logs.length - 1 ? "1px solid var(--border)" : "none" }}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: am.color + "18", color: am.color }}>
                    <ResIcon size={13} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: "var(--text)" }}>
                      <span style={{ color: am.color }} className="font-medium capitalize">{am.label}</span>
                      {" "}
                      <span className="capitalize">{log.resource.replace("_", " ")}</span>
                      {desc && <span style={{ color: "var(--text-muted)" }}> {desc}</span>}
                    </p>
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                      {log.userEmail ?? "system"}
                    </p>
                  </div>
                  <span className="text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                    {timeAgo(log.createdAt)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { href: "/collections", label: "Create a collection", desc: "Define your data model",     color: "#00C8F8" },
            { href: "/files",       label: "Upload files",        desc: "Manage your media library",  color: "#7B61FF" },
            { href: "/users",       label: "Add a user",          desc: "Collaborate with your team", color: "#00D68F" },
          ].map(({ href, label, desc, color }) => (
            <Link
              key={href}
              href={href}
              className="rounded-xl p-5 flex flex-col gap-2 transition-opacity duration-150 hover:opacity-80"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
            >
              <span className="text-sm font-semibold" style={{ color }}>{label}</span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{desc}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

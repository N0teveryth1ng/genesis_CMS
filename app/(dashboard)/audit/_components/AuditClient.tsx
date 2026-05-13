"use client";

import { useRouter } from "next/navigation";
import {
  ClipboardList, Plus, Edit2, Trash2, Database,
  Users, Globe, Key, FolderOpen, ChevronLeft, ChevronRight,
} from "lucide-react";
import type { AuditLogEntry } from "@/lib/actions/audit";

/* ── Helpers ─────────────────────────────────────────────── */
const ACTION_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  create: { bg: "rgba(0,212,140,0.12)", color: "var(--success)", label: "Created"  },
  update: { bg: "rgba(0,180,248,0.12)", color: "var(--info)",    label: "Updated"  },
  delete: { bg: "rgba(255,77,106,0.12)", color: "var(--danger)", label: "Deleted"  },
};

const RESOURCE_ICONS: Record<string, React.ElementType> = {
  record:     Database,
  collection: FolderOpen,
  user:       Users,
  webhook:    Globe,
  api_key:    Key,
  file:       FolderOpen,
};

const RESOURCE_ICONS_ACTION: Record<string, React.ElementType> = {
  create: Plus,
  update: Edit2,
  delete: Trash2,
};

function parseMeta(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try { return JSON.parse(raw) as Record<string, unknown>; } catch { return {}; }
}

function buildDescription(log: AuditLogEntry): string {
  const meta = parseMeta(log.meta);
  const res  = log.resource;
  const act  = log.action;

  if (res === "record") {
    const col = meta.collectionName ? ` in ${meta.collectionName}` : "";
    return `Record${col}`;
  }
  if (res === "collection") return String(meta.label ?? meta.name ?? log.resourceId ?? "Collection");
  if (res === "user")       return String(meta.email ?? meta.name ?? log.resourceId ?? "User");
  if (res === "webhook")    return String(meta.name ?? log.resourceId ?? "Webhook");
  if (res === "api_key")    return String(meta.name ?? log.resourceId ?? "API Key");
  if (res === "file")       return String(meta.name ?? log.resourceId ?? "File");
  return `${act} ${res}`;
}

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60)       return `${diff}s ago`;
  if (diff < 3600)     return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)    return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800)   return `${Math.floor(diff / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
}

/* ── Row ─────────────────────────────────────────────────── */
function AuditRow({ log }: { log: AuditLogEntry }) {
  const actionStyle = ACTION_STYLES[log.action] ?? ACTION_STYLES.create;
  const ResIcon   = RESOURCE_ICONS[log.resource] ?? Database;
  const ActIcon   = RESOURCE_ICONS_ACTION[log.action] ?? Edit2;
  const desc      = buildDescription(log);

  return (
    <div
      className="flex items-center gap-4 px-5 py-3.5 border-b"
      style={{ borderColor: "var(--border)" }}
    >
      {/* Resource icon */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: actionStyle.bg, color: actionStyle.color }}
      >
        <ResIcon size={15} />
      </div>

      {/* Description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Action badge */}
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: actionStyle.bg, color: actionStyle.color }}
          >
            <ActIcon size={9} />
            {actionStyle.label}
          </span>

          {/* Resource type */}
          <span className="text-xs font-mono capitalize" style={{ color: "var(--text-muted)" }}>
            {log.resource.replace("_", " ")}
          </span>

          {/* Description */}
          <span className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>
            {desc}
          </span>
        </div>

        {/* Actor */}
        <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
          by {log.userEmail ?? "system"}
          {log.resourceId && (
            <span className="ml-2 font-mono opacity-60">{log.resourceId.slice(0, 10)}…</span>
          )}
        </p>
      </div>

      {/* Time */}
      <p className="text-xs whitespace-nowrap flex-shrink-0" style={{ color: "var(--text-muted)" }}>
        {timeAgo(log.createdAt)}
      </p>
    </div>
  );
}

/* ── Main client ─────────────────────────────────────────── */
export default function AuditClient({
  logs,
  total,
  page,
  limit,
}: {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}) {
  const router  = useRouter();
  const pages   = Math.max(1, Math.ceil(total / limit));

  function goTo(p: number) {
    router.push(`/audit?page=${p}`);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Audit Log</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            {total} event{total !== 1 ? "s" : ""} recorded
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        {/* Table header */}
        <div className="px-5 py-2.5 border-b flex items-center gap-2"
          style={{ background: "var(--bg-raised)", borderColor: "var(--border)" }}>
          <ClipboardList size={13} style={{ color: "var(--text-muted)" }} />
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Activity
          </span>
        </div>

        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
              <ClipboardList size={26} />
            </div>
            <p className="text-base font-semibold" style={{ color: "var(--text)" }}>No activity yet</p>
            <p className="text-sm text-center max-w-sm" style={{ color: "var(--text-muted)" }}>
              Events are recorded as you create, edit, and delete content.
            </p>
          </div>
        ) : (
          <div>
            {logs.map((log) => <AuditRow key={log.id} log={log} />)}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Page {page} of {pages} · {total} events
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goTo(page - 1)}
              disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              <ChevronLeft size={13} /> Prev
            </button>
            <button
              onClick={() => goTo(page + 1)}
              disabled={page >= pages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

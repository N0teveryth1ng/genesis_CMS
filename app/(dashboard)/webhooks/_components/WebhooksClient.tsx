"use client";

import { useState, useTransition } from "react";
import {
  Globe, Plus, Trash2, Loader2, ToggleLeft, ToggleRight,
  ChevronDown, ChevronUp, ShieldCheck, Clock, Zap,
} from "lucide-react";
import {
  createWebhook, toggleWebhook, deleteWebhook,
} from "@/lib/actions/webhooks";
import type { Webhook } from "@prisma/client";

const ALL_EVENTS = [
  { value: "record.create", label: "Record Created" },
  { value: "record.update", label: "Record Updated" },
  { value: "record.delete", label: "Record Deleted" },
];

function parseEvents(raw: string): string[] {
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

/* ── Create modal ────────────────────────────────────────── */
function CreateModal({
  collections,
  onClose,
  onCreated,
}: {
  collections: { id: string; label: string }[];
  onClose: () => void;
  onCreated: (wh: Webhook) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["record.create", "record.update", "record.delete"]);

  function toggleEvent(v: string) {
    setSelectedEvents((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    selectedEvents.forEach((ev) => formData.append("events", ev));

    startTransition(async () => {
      try {
        await createWebhook(formData);
        onClose();
        onCreated({} as Webhook);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  const baseInput = "rounded-lg px-3 py-2.5 text-sm outline-none w-full";
  const baseStyle = { background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" };

  return (
    <div
      className="fixed inset-0 z-200 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl flex flex-col max-h-[90vh]"
        style={{ background: "var(--bg-raised)", border: "1px solid var(--border-light)", boxShadow: "var(--shadow-lg)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>New Webhook</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "var(--text-muted)" }}>✕</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6 overflow-y-auto">
          {error && (
            <div className="rounded-lg px-4 py-3 text-sm" style={{ background: "rgba(255,77,106,0.1)", border: "1px solid rgba(255,77,106,0.2)", color: "var(--danger)" }}>
              {error}
            </div>
          )}

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>Name <span style={{ color: "var(--danger)" }}>*</span></label>
            <input name="name" required placeholder="My Webhook" className={baseInput} style={baseStyle}
              onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--primary)"; }}
              onBlur={(e)  => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
            />
          </div>

          {/* URL */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>Endpoint URL <span style={{ color: "var(--danger)" }}>*</span></label>
            <input name="url" type="url" required placeholder="https://example.com/hook" className={baseInput} style={baseStyle}
              onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--primary)"; }}
              onBlur={(e)  => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
            />
          </div>

          {/* Collection filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>Collection</label>
            <select name="collectionId" className={baseInput} style={{ ...baseStyle, cursor: "pointer" }}>
              <option value="">All collections</option>
              {collections.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>

          {/* Events */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>Events <span style={{ color: "var(--danger)" }}>*</span></label>
            <div className="flex flex-col gap-1.5 rounded-lg p-3" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              {ALL_EVENTS.map((ev) => (
                <label key={ev.value} className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={selectedEvents.includes(ev.value)} onChange={() => toggleEvent(ev.value)} className="accent-(--primary)" />
                  <span className="text-sm" style={{ color: "var(--text)" }}>{ev.label}</span>
                  <code className="text-[10px] ml-auto font-mono" style={{ color: "var(--text-muted)" }}>{ev.value}</code>
                </label>
              ))}
            </div>
          </div>

          {/* Secret */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium flex items-center gap-1" style={{ color: "var(--text-soft)" }}>
              <ShieldCheck size={11} /> Secret (optional)
            </label>
            <input name="secret" type="password" placeholder="Used to sign the X-Genesis-Signature header" className={`${baseInput} font-mono text-xs`} style={baseStyle}
              onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--primary)"; }}
              onBlur={(e)  => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg py-2.5 text-sm font-medium"
              style={{ background: "var(--bg-overlay)", color: "var(--text-soft)", border: "1px solid var(--border)" }}>
              Cancel
            </button>
            <button type="submit" disabled={isPending || selectedEvents.length === 0}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50"
              style={{ background: "var(--primary)", color: "var(--text-inverse)" }}>
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {isPending ? "Creating…" : "Create Webhook"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Webhook row ─────────────────────────────────────────── */
function WebhookRow({
  webhook,
  onToggle,
  onDelete,
}: {
  webhook: Webhook;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const events = parseEvents(webhook.events);

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg-surface)" }}>
      {/* Main row */}
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Active dot */}
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: webhook.active ? "var(--success)" : "var(--border)" }} />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{webhook.name}</p>
          <p className="text-xs font-mono truncate mt-0.5" style={{ color: "var(--text-muted)" }}>{webhook.url}</p>
        </div>

        {/* Events badges */}
        <div className="hidden sm:flex items-center gap-1.5 flex-wrap">
          {events.map((ev) => (
            <span key={ev} className="px-2 py-0.5 rounded-full text-[10px] font-medium"
              style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
              {ev}
            </span>
          ))}
        </div>

        {/* Last fired */}
        {webhook.lastFiredAt && (
          <div className="hidden md:flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
            <Clock size={11} />
            {new Date(webhook.lastFiredAt).toLocaleDateString()}
          </div>
        )}

        {/* Toggle */}
        <button
          onClick={() => onToggle(webhook.id, !webhook.active)}
          className="flex-shrink-0 transition-colors"
          style={{ color: webhook.active ? "var(--primary)" : "var(--text-muted)" }}
          title={webhook.active ? "Disable" : "Enable"}
        >
          {webhook.active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
        </button>

        {/* Expand */}
        <button onClick={() => setExpanded((x) => !x)} className="p-1 rounded" style={{ color: "var(--text-muted)" }}>
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-5 pb-4 pt-0 border-t flex flex-col gap-3" style={{ borderColor: "var(--border)" }}>
          <div className="grid grid-cols-2 gap-3 pt-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>ID</p>
              <p className="text-xs font-mono" style={{ color: "var(--text-soft)" }}>{webhook.id}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Created</p>
              <p className="text-xs" style={{ color: "var(--text-soft)" }}>{new Date(webhook.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Scope</p>
              <p className="text-xs" style={{ color: "var(--text-soft)" }}>{webhook.collectionId ? `Collection: ${webhook.collectionId.slice(0, 12)}…` : "All collections"}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Signature</p>
              <p className="text-xs" style={{ color: "var(--text-soft)" }}>{webhook.secret ? "HMAC-SHA256 enabled" : "None"}</p>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => onDelete(webhook.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: "rgba(255,77,106,0.1)", color: "var(--danger)", border: "1px solid rgba(255,77,106,0.2)" }}
            >
              <Trash2 size={12} /> Delete Webhook
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main client ─────────────────────────────────────────── */
export default function WebhooksClient({
  initialWebhooks,
  collections,
}: {
  initialWebhooks: Webhook[];
  collections: { id: string; label: string }[];
}) {
  const [webhooks, setWebhooks] = useState<Webhook[]>(initialWebhooks);
  const [showCreate, setShowCreate] = useState(false);
  const [, startTransition] = useTransition();

  function handleToggle(id: string, active: boolean) {
    startTransition(async () => {
      await toggleWebhook(id, active);
      setWebhooks((prev) => prev.map((w) => w.id === id ? { ...w, active } : w));
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteWebhook(id);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
    });
  }

  function handleCreated() {
    window.location.reload();
  }

  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Webhooks</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            Receive real-time HTTP events when content changes.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
          style={{ background: "var(--primary)", color: "var(--text-inverse)" }}
        >
          <Plus size={15} /> Add Webhook
        </button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl px-4 py-3"
        style={{ background: "var(--primary-dim)", border: "1px solid rgba(0,212,255,0.2)" }}>
        <Zap size={15} className="mt-0.5 flex-shrink-0" style={{ color: "var(--primary)" }} />
        <p className="text-xs" style={{ color: "var(--text-soft)" }}>
          Webhooks fire after every record create, update, or delete. Payloads are signed with{" "}
          <code className="font-mono">X-Genesis-Signature: sha256=&lt;hmac&gt;</code> when a secret is set.
          Delivery is fire-and-forget with an 8-second timeout.
        </p>
      </div>

      {/* List */}
      {webhooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-xl gap-4"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
            <Globe size={26} />
          </div>
          <p className="text-base font-semibold" style={{ color: "var(--text)" }}>No webhooks yet</p>
          <p className="text-sm text-center max-w-sm" style={{ color: "var(--text-muted)" }}>
            Webhooks notify your services when content changes happen in real time.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg"
            style={{ background: "var(--primary-dim)", color: "var(--primary)" }}
          >
            <Plus size={14} /> Add first webhook
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {webhooks.map((wh) => (
            <WebhookRow
              key={wh.id}
              webhook={wh}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateModal
          collections={collections}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Key, Trash2, Loader2, Copy, Check,
  ShieldCheck, Eye, AlertCircle, X,
} from "lucide-react";
import { createApiKey, revokeApiKey } from "@/lib/actions/apikeys";
import type { ApiKey } from "@prisma/client";

/* ── Copy button ─────────────────────────────────────────── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy} className="p-1.5 rounded-md transition-colors"
      style={{ color: copied ? "var(--success)" : "var(--text-muted)", background: "var(--bg-overlay)" }}>
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

/* ── New key revealed banner ─────────────────────────────── */
function KeyRevealBanner({ apiKey, onDismiss }: { apiKey: string; onDismiss: () => void }) {
  return (
    <div className="rounded-xl p-5 flex flex-col gap-3"
      style={{ background: "rgba(0,214,143,0.08)", border: "2px solid rgba(0,214,143,0.25)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} style={{ color: "var(--success)" }} />
          <p className="text-sm font-semibold" style={{ color: "var(--success)" }}>
            API key created — copy it now
          </p>
        </div>
        <button onClick={onDismiss} style={{ color: "var(--text-muted)" }}><X size={15} /></button>
      </div>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        This key will never be shown again. Store it somewhere safe.
      </p>
      <div className="flex items-center gap-2 rounded-lg px-3 py-2.5"
        style={{ background: "var(--bg-raised)", border: "1px solid var(--border)" }}>
        <code className="flex-1 text-xs font-mono break-all" style={{ color: "var(--text)" }}>
          {apiKey}
        </code>
        <CopyButton text={apiKey} />
      </div>
    </div>
  );
}

/* ── Create modal ────────────────────────────────────────── */
function CreateKeyModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (key: string) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [perms, setPerms] = useState<"read" | "read_write">("read");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("permissions", perms);
    startTransition(async () => {
      try {
        const res = await createApiKey(fd);
        router.refresh();
        onCreated(res.key);
        onClose();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to create key");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl flex flex-col"
        style={{ background: "var(--bg-raised)", border: "1px solid var(--border-light)", boxShadow: "var(--shadow-lg)" }}
        onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Generate API Key</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-overlay)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          {error && (
            <div className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm"
              style={{ background: "rgba(255,77,106,0.1)", border: "1px solid rgba(255,77,106,0.2)", color: "var(--danger)" }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>
              Key Name <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <input
              name="name" required placeholder="e.g. Frontend App, Mobile Client"
              className="rounded-lg px-3 py-2.5 text-sm outline-none"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
              onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--primary)"; }}
              onBlur={(e)  => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>Permissions</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "read",       label: "Read Only",   desc: "GET requests only",     icon: Eye        },
                { value: "read_write", label: "Read & Write", desc: "Full CRUD access",     icon: ShieldCheck },
              ].map(({ value, label, desc, icon: Icon }) => (
                <button key={value} type="button" onClick={() => setPerms(value as typeof perms)}
                  className="flex flex-col items-start gap-0.5 rounded-lg px-3 py-2.5 text-left transition-all"
                  style={{
                    background: perms === value ? "var(--primary-dim)" : "var(--bg-surface)",
                    border:     `1px solid ${perms === value ? "var(--primary)" : "var(--border)"}`,
                  }}>
                  <Icon size={13} style={{ color: perms === value ? "var(--primary)" : "var(--text-muted)" }} />
                  <span className="text-xs font-semibold mt-1" style={{ color: perms === value ? "var(--primary)" : "var(--text)" }}>
                    {label}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg py-2.5 text-sm font-medium"
              style={{ background: "var(--bg-overlay)", color: "var(--text-soft)", border: "1px solid var(--border)" }}>
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50"
              style={{ background: "var(--primary)", color: "var(--text-inverse)" }}>
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {isPending ? "Generating…" : "Generate Key"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Key row ─────────────────────────────────────────────── */
function KeyRow({ apiKey }: { apiKey: ApiKey }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isRW = apiKey.permissions === "read_write";

  function handleRevoke(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirming) { setConfirming(true); return; }
    startTransition(async () => {
      await revokeApiKey(apiKey.id);
      router.refresh();
    });
  }

  return (
    <div className="group flex items-center gap-4 px-5 py-4 transition-colors"
      style={{ borderBottom: "1px solid var(--border)" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--bg-overlay)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; setConfirming(false); }}>

      {/* Icon */}
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: isRW ? "rgba(123,97,255,0.12)" : "var(--primary-dim)", color: isRW ? "#7B61FF" : "var(--primary)" }}>
        <Key size={14} />
      </div>

      {/* Name + prefix */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{apiKey.name}</p>
        <p className="text-[11px] font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>
          {apiKey.prefix}••••••••••••••••••••
        </p>
      </div>

      {/* Permissions badge */}
      <span className="px-2.5 py-1 rounded-full text-xs font-semibold shrink-0"
        style={{
          background: isRW ? "rgba(123,97,255,0.12)" : "var(--primary-dim)",
          color:      isRW ? "#7B61FF"                : "var(--primary)",
        }}>
        {isRW ? "Read & Write" : "Read Only"}
      </span>

      {/* Last used */}
      <span className="text-xs shrink-0 w-28 text-right" style={{ color: "var(--text-muted)" }}>
        {apiKey.lastUsedAt
          ? `Used ${new Date(apiKey.lastUsedAt).toLocaleDateString()}`
          : "Never used"}
      </span>

      {/* Revoke */}
      <button
        onClick={handleRevoke}
        disabled={isPending}
        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all opacity-0 group-hover:opacity-100 shrink-0"
        style={{
          background: confirming ? "var(--danger)" : "var(--bg-raised)",
          color:      confirming ? "#fff"          : "var(--danger)",
        }}>
        {isPending ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
        {confirming ? "Sure?" : "Revoke"}
      </button>
    </div>
  );
}

/* ── Main client ─────────────────────────────────────────── */
export default function ApiKeysClient({ keys }: { keys: ApiKey[] }) {
  const [showModal, setShowModal] = useState(false);
  const [newKey, setNewKey]       = useState<string | null>(null);

  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>API Keys</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            Authenticate external apps against the Genesis REST API.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
          style={{ background: "var(--primary)", color: "var(--text-inverse)" }}>
          <Plus size={15} /> Generate Key
        </button>
      </div>

      {/* Reveal banner */}
      {newKey && <KeyRevealBanner apiKey={newKey} onDismiss={() => setNewKey(null)} />}

      {/* Info box */}
      <div className="rounded-xl px-5 py-4 flex flex-col gap-1.5"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>How to use</p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Pass the key in the <code className="font-mono px-1 rounded" style={{ background: "var(--bg-raised)" }}>Authorization</code> header of every request:
        </p>
        <div className="flex items-center gap-2 mt-1 rounded-lg px-3 py-2"
          style={{ background: "var(--bg-raised)", border: "1px solid var(--border)" }}>
          <code className="flex-1 text-xs font-mono" style={{ color: "var(--primary)" }}>
            Authorization: Bearer &lt;your-api-key&gt;
          </code>
        </div>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          Base URL: <code className="font-mono px-1 rounded" style={{ background: "var(--bg-raised)", color: "var(--text)" }}>
            {typeof window !== "undefined" ? window.location.origin : ""}/api/v1/&lt;collection-name&gt;
          </code>
        </p>
      </div>

      {/* Keys table */}
      <div className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--border)", background: "var(--bg-surface)" }}>
        <div className="flex items-center gap-4 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider"
          style={{ background: "var(--bg-raised)", borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>
          <span className="w-8" />
          <span className="flex-1">Name / Prefix</span>
          <span>Permissions</span>
          <span className="w-28 text-right">Last Used</span>
          <span className="w-16" />
        </div>

        {keys.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255,184,0,0.1)", color: "#FFB800" }}>
              <Key size={22} />
            </div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No API keys yet.</p>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg"
              style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
              <Plus size={14} /> Generate your first key
            </button>
          </div>
        ) : (
          keys.map((k) => <KeyRow key={k.id} apiKey={k} />)
        )}
      </div>

      {showModal && (
        <CreateKeyModal
          onClose={() => setShowModal(false)}
          onCreated={(k) => setNewKey(k)}
        />
      )}
    </div>
  );
}

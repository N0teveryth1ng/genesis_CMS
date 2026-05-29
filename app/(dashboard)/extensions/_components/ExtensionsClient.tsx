"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Puzzle, Plus, Trash2, Loader2, Settings2, ToggleLeft, ToggleRight, X } from "lucide-react";
import { installExtension, updateExtension, uninstallExtension } from "@/lib/actions/extensions";
import type { Plugin, PluginConfigField } from "@/lib/extensions/registry";

type Collection = { id: string; name: string; label: string };
type Installed  = { id: string; pluginId: string; active: boolean; config: string; collectionId: string | null; events: string };

const CATEGORY_COLORS: Record<string, string> = {
  transform:  "#3b82f6",
  validation: "#ef4444",
  compute:    "#22c55e",
};

/* ── Config form ─────────────────────────────────────────── */
function ConfigField({ field, value, onChange }: {
  field: PluginConfigField;
  value: string;
  onChange: (v: string) => void;
}) {
  if (field.type === "select") {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          {field.label}
        </label>
        <select value={value} onChange={(e) => onChange(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg text-xs outline-none"
          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}>
          {field.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
        {field.label}{field.required && <span style={{ color: "var(--danger)" }}> *</span>}
      </label>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className="px-2.5 py-1.5 rounded-lg text-xs outline-none"
        style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
    </div>
  );
}

/* ── Install modal ───────────────────────────────────────── */
function InstallModal({ plugin, collections, onClose }: {
  plugin: Plugin; collections: Collection[]; onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [config, setConfig] = useState<Record<string, string>>({});
  const [collectionId, setCollectionId] = useState("");
  const [events, setEvents] = useState("create,update");

  function setConfigKey(key: string, val: string) {
    setConfig((prev) => ({ ...prev, [key]: val }));
  }

  function handleInstall() {
    start(async () => {
      await installExtension({
        pluginId: plugin.id,
        collectionId: collectionId || undefined,
        events,
        config,
      });
      onClose();
      router.refresh();
    });
  }

  const color = CATEGORY_COLORS[plugin.category] ?? "#888";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-5"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{plugin.icon}</span>
            <div>
              <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>{plugin.name}</h2>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded"
                style={{ background: `${color}18`, color }}>{plugin.category}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}><X size={16} /></button>
        </div>

        <p className="text-sm" style={{ color: "var(--text-muted)" }}>{plugin.description}</p>

        {plugin.configFields.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>Configuration</p>
            {plugin.configFields.map((f) => (
              <ConfigField key={f.key} field={f} value={config[f.key] ?? ""} onChange={(v) => setConfigKey(f.key, v)} />
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Collection <span style={{ fontWeight: 400 }}>(blank = all)</span>
            </label>
            <select value={collectionId} onChange={(e) => setCollectionId(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg text-xs outline-none"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}>
              <option value="">All collections</option>
              {collections.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Fire on
            </label>
            <select value={events} onChange={(e) => setEvents(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg text-xs outline-none"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}>
              <option value="create,update">Create & Update</option>
              <option value="create">Create only</option>
              <option value="update">Update only</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm"
            style={{ background: "var(--bg-raised)", color: "var(--text-soft)" }}>Cancel</button>
          <button onClick={handleInstall} disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
            style={{ background: "var(--primary)", color: "var(--text-inverse)" }}>
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            Install
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Installed card ──────────────────────────────────────── */
function InstalledCard({ ext, plugin, collections }: {
  ext: Installed; plugin: Plugin | undefined; collections: Collection[];
}) {
  const router = useRouter();
  const [toggling, startToggle] = useTransition();
  const [removing, startRemove] = useTransition();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  if (!plugin) return null;
  const color = CATEGORY_COLORS[plugin.category] ?? "#888";

  const targetCol = collections.find((c) => c.id === ext.collectionId);

  let config: Record<string, string> = {};
  try { config = JSON.parse(ext.config); } catch { /* empty */ }

  function toggle() {
    startToggle(async () => {
      await updateExtension(ext.id, { active: !ext.active });
      router.refresh();
    });
  }

  function remove() {
    if (!confirmRemove) { setConfirmRemove(true); return; }
    startRemove(async () => {
      await uninstallExtension(ext.id);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl overflow-hidden"
      style={{ border: "1px solid var(--border)", background: "var(--bg-surface)" }}>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-xl">{plugin.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{plugin.name}</p>
            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded"
              style={{ background: `${color}18`, color }}>{plugin.category}</span>
            {targetCol && (
              <span className="text-[10px] px-1.5 py-0.5 rounded"
                style={{ background: "var(--bg-raised)", color: "var(--text-muted)" }}>
                {targetCol.label}
              </span>
            )}
            <span className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ background: "var(--bg-raised)", color: "var(--text-muted)" }}>
              {ext.events}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {plugin.configFields.length > 0 && (
            <button onClick={() => setShowConfig((v) => !v)}
              className="p-1.5 rounded-lg" style={{ color: "var(--text-muted)", background: "var(--bg-raised)" }}>
              <Settings2 size={13} />
            </button>
          )}
          <button onClick={toggle} disabled={toggling}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
            style={{
              background: ext.active ? "color-mix(in srgb, #22c55e 12%, transparent)" : "var(--bg-raised)",
              color: ext.active ? "#22c55e" : "var(--text-muted)",
            }}>
            {toggling ? <Loader2 size={11} className="animate-spin" /> : ext.active ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
            {ext.active ? "On" : "Off"}
          </button>
          <button onClick={remove}
            onMouseLeave={() => setConfirmRemove(false)}
            disabled={removing}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
            style={{
              background: confirmRemove ? "var(--danger)" : "var(--bg-raised)",
              color: confirmRemove ? "#fff" : "var(--danger)",
            }}>
            {removing ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
            {confirmRemove ? "Sure?" : "Remove"}
          </button>
        </div>
      </div>

      {showConfig && plugin.configFields.length > 0 && (
        <div className="px-4 pb-4 pt-0 grid grid-cols-2 gap-2"
          style={{ borderTop: "1px solid var(--border)" }}>
          {plugin.configFields.map((f) => (
            <div key={f.key} className="flex flex-col gap-0.5">
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{f.label}</span>
              <span className="text-xs font-mono" style={{ color: "var(--text)" }}>{config[f.key] || "—"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Plugin card (marketplace) ───────────────────────────── */
function PluginCard({ plugin, installedCount, onInstall }: {
  plugin: Plugin; installedCount: number; onInstall: () => void;
}) {
  const color = CATEGORY_COLORS[plugin.category] ?? "#888";
  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{plugin.icon}</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{plugin.name}</p>
            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded"
              style={{ background: `${color}18`, color }}>{plugin.category}</span>
          </div>
        </div>
        {installedCount > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0"
            style={{ background: "color-mix(in srgb, #22c55e 15%, transparent)", color: "#22c55e" }}>
            {installedCount} active
          </span>
        )}
      </div>
      <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{plugin.description}</p>
      <button onClick={onInstall}
        className="flex items-center gap-1.5 justify-center w-full py-2 rounded-lg text-xs font-semibold"
        style={{ background: "var(--primary-dim)", color: "var(--primary)" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--primary)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-inverse)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--primary-dim)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--primary)"; }}
      >
        <Plus size={12} /> Install
      </button>
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────── */
export default function ExtensionsClient({ plugins, installed, collections }: {
  plugins: Plugin[]; installed: Installed[]; collections: Collection[];
}) {
  const [installing, setInstalling] = useState<Plugin | null>(null);

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Extensions</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          Install plugins that transform record data before it's saved.
        </p>
      </div>

      {/* Installed */}
      {installed.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            Installed <span className="font-normal" style={{ color: "var(--text-muted)" }}>({installed.length})</span>
          </p>
          <div className="flex flex-col gap-2">
            {installed.map((ext) => (
              <InstalledCard
                key={ext.id} ext={ext}
                plugin={plugins.find((p) => p.id === ext.pluginId)}
                collections={collections}
              />
            ))}
          </div>
        </div>
      )}

      {/* Marketplace */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Available Plugins</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {plugins.map((plugin) => (
            <PluginCard
              key={plugin.id} plugin={plugin}
              installedCount={installed.filter((i) => i.pluginId === plugin.id).length}
              onInstall={() => setInstalling(plugin)}
            />
          ))}
        </div>
      </div>

      {installing && (
        <InstallModal
          plugin={installing}
          collections={collections}
          onClose={() => setInstalling(null)}
        />
      )}
    </div>
  );
}

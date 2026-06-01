"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Zap, Plus, Trash2, Play, Loader2,
  ChevronRight, Circle,
} from "lucide-react";
import Link from "next/link";
import { createFlow, deleteFlow, runFlowManually } from "@/lib/actions/flows";
import type { TriggerConfig } from "@/lib/actions/flows";

type Collection = { id: string; name: string; label: string };
type Flow = {
  id: string; name: string; description: string | null;
  active: boolean; trigger: string; runCount: number;
  lastRunAt: Date | null; createdAt: Date;
  _count: { runs: number };
};

const TRIGGER_LABELS: Record<string, string> = {
  "record.create": "Record Created",
  "record.update": "Record Updated",
  "record.delete": "Record Deleted",
  "manual":        "Manual",
};

const TRIGGER_COLORS: Record<string, string> = {
  "record.create": "#22c55e",
  "record.update": "#3b82f6",
  "record.delete": "#ef4444",
  "manual":        "#a855f7",
};

/* ── Create modal ────────────────────────────────────────── */
function CreateFlowModal({ collections, onClose }: { collections: Collection[]; onClose: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [triggerType, setTriggerType] = useState<TriggerConfig["type"]>("manual");
  const [collectionId, setCollectionId] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("triggerType", triggerType);
    if (collectionId) {
      fd.set("collectionId", collectionId);
      const col = collections.find((c) => c.id === collectionId);
      if (col) fd.set("collectionName", col.name);
    }
    startTransition(async () => {
      const res = await createFlow(fd);
      if (res.ok) {
        router.push(`/flows/${res.flow.id}`);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-5"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>New Flow</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Name</label>
            <input
              name="name" required autoFocus
              placeholder="e.g. Notify on new post"
              className="px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "var(--bg-raised)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Trigger</label>
            <div className="grid grid-cols-2 gap-2">
              {(["record.create", "record.update", "record.delete", "manual"] as const).map((t) => (
                <button
                  key={t} type="button"
                  onClick={() => setTriggerType(t)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left"
                  style={{
                    border: `1px solid ${triggerType === t ? TRIGGER_COLORS[t] : "var(--border)"}`,
                    background: triggerType === t ? `${TRIGGER_COLORS[t]}18` : "var(--bg-raised)",
                    color: triggerType === t ? TRIGGER_COLORS[t] : "var(--text-soft)",
                  }}
                >
                  <Circle size={6} fill={TRIGGER_COLORS[t]} color={TRIGGER_COLORS[t]} />
                  {TRIGGER_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {triggerType !== "manual" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                Collection <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional — blank = all)</span>
              </label>
              <select
                value={collectionId}
                onChange={(e) => setCollectionId(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "var(--bg-raised)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                <option value="">Any collection</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-2 justify-end mt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm"
              style={{ background: "var(--bg-raised)", color: "var(--text-soft)" }}>
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
              style={{ background: "var(--primary)", color: "var(--text-inverse)" }}>
              {isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Create Flow
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Flow card ───────────────────────────────────────────── */
function FlowCard({ flow }: { flow: Flow }) {
  const router = useRouter();
  const [running, startRunTransition] = useTransition();
  const [deleting, startDelTransition] = useTransition();
  const [confirmDel, setConfirmDel] = useState(false);

  let trigger: TriggerConfig = { type: "manual" };
  try { trigger = JSON.parse(flow.trigger); } catch { /* empty */ }

  const color = TRIGGER_COLORS[trigger.type] ?? "#888";

  function handleRun(e: React.MouseEvent) {
    e.preventDefault();
    startRunTransition(async () => {
      await runFlowManually(flow.id);
      router.refresh();
    });
  }

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    if (!confirmDel) { setConfirmDel(true); return; }
    startDelTransition(async () => {
      await deleteFlow(flow.id);
      router.refresh();
    });
  }

  return (
    <Link href={`/flows/${flow.id}`}
      className="group flex items-center gap-4 px-5 py-4 rounded-xl transition-all"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--primary)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border)"; }}
    >
      {/* Trigger dot */}
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}18`, color }}>
        <Zap size={16} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm truncate" style={{ color: "var(--text)" }}>{flow.name}</p>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
            style={{ background: `${color}18`, color }}>
            {TRIGGER_LABELS[trigger.type]}
          </span>
          {!flow.active && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
              style={{ background: "var(--bg-raised)", color: "var(--text-muted)" }}>
              Inactive
            </span>
          )}
        </div>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          {flow._count.runs} runs
          {flow.lastRunAt && ` · Last: ${new Date(flow.lastRunAt).toLocaleString()}`}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {trigger.type === "manual" && (
          <button onClick={handleRun} disabled={running}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "var(--bg-raised)", color: "var(--text-soft)" }}>
            {running ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
            Run
          </button>
        )}
        <button
          onClick={handleDelete}
          onMouseLeave={() => setConfirmDel(false)}
          disabled={deleting}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium"
          style={{
            background: confirmDel ? "var(--danger)" : "var(--bg-raised)",
            color: confirmDel ? "#fff" : "var(--danger)",
          }}>
          {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
          {confirmDel ? "Sure?" : "Delete"}
        </button>
      </div>

      <ChevronRight size={15} style={{ color: "var(--text-muted)" }} className="shrink-0" />
    </Link>
  );
}

/* ── Main ────────────────────────────────────────────────── */
export default function FlowsClient({ flows, collections }: { flows: Flow[]; collections: Collection[] }) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Flows</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            Automate actions triggered by data events.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: "var(--primary)", color: "var(--text-inverse)" }}
        >
          <Plus size={15} /> New Flow
        </button>
      </div>

      {/* Stats */}
      {flows.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total",    value: flows.length },
            { label: "Active",   value: flows.filter((f) => f.active).length },
            { label: "Total Runs", value: flows.reduce((s, f) => s + f.runCount, 0) },
          ].map((s) => (
            <div key={s.label} className="rounded-xl px-4 py-3"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              <p className="text-xl font-bold" style={{ color: "var(--text)" }}>{s.value}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* List */}
      {flows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-xl gap-4"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(255,184,0,0.12)", color: "#FFB800" }}>
            <Zap size={26} />
          </div>
          <p className="text-base font-semibold" style={{ color: "var(--text)" }}>No flows yet</p>
          <p className="text-sm text-center max-w-xs" style={{ color: "var(--text-muted)" }}>
            Create your first flow to automate actions when records are created, updated, or deleted.
          </p>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: "var(--primary)", color: "var(--text-inverse)" }}>
            <Plus size={14} /> Create Flow
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {flows.map((f) => <FlowCard key={f.id} flow={f} />)}
        </div>
      )}

      {showCreate && <CreateFlowModal collections={collections} onClose={() => setShowCreate(false)} />}
    </div>
  );
}

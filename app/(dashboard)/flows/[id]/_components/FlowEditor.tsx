"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Zap, Plus, Trash2, Play, Loader2, Save, ArrowLeft,
  ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock,
  Globe, FileText, Filter, AlignLeft, ToggleLeft, ToggleRight,
} from "lucide-react";
import Link from "next/link";
import { updateFlow, runFlowManually } from "@/lib/actions/flows";
import type { FlowStep, TriggerConfig } from "@/lib/actions/flows";

type Collection = { id: string; name: string; label: string };
type FlowRun   = { id: string; status: string; log: string; startedAt: Date; endedAt: Date | null };
type Flow      = {
  id: string; name: string; description: string | null;
  active: boolean; trigger: string; steps: string; runCount: number;
  lastRunAt: Date | null; runs: FlowRun[];
};

const STEP_ICONS: Record<string, React.ElementType> = {
  condition:     Filter,
  webhook:       Globe,
  create_record: FileText,
  log:           AlignLeft,
};

const STEP_COLORS: Record<string, string> = {
  condition:     "#f59e0b",
  webhook:       "#3b82f6",
  create_record: "#22c55e",
  log:           "#8b5cf6",
};

const TRIGGER_COLORS: Record<string, string> = {
  "record.create": "#22c55e",
  "record.update": "#3b82f6",
  "record.delete": "#ef4444",
  "manual":        "#a855f7",
};

/* ── Step config forms ───────────────────────────────────── */
function ConditionForm({ step, onChange }: { step: Extract<FlowStep, { type: "condition" }>; onChange: (s: FlowStep) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2 mt-3">
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Field</label>
        <input value={step.field} onChange={(e) => onChange({ ...step, field: e.target.value })}
          placeholder="e.g. status"
          className="px-2.5 py-1.5 rounded-lg text-xs outline-none"
          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Operator</label>
        <select value={step.op} onChange={(e) => onChange({ ...step, op: e.target.value })}
          className="px-2.5 py-1.5 rounded-lg text-xs outline-none"
          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}>
          <option value="eq">equals</option>
          <option value="neq">not equals</option>
          <option value="contains">contains</option>
          <option value="not_contains">not contains</option>
          <option value="gt">greater than</option>
          <option value="lt">less than</option>
          <option value="empty">is empty</option>
          <option value="not_empty">is not empty</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Value</label>
        <input value={step.value} onChange={(e) => onChange({ ...step, value: e.target.value })}
          placeholder="published"
          className="px-2.5 py-1.5 rounded-lg text-xs outline-none"
          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
      </div>
    </div>
  );
}

function WebhookForm({ step, onChange }: { step: Extract<FlowStep, { type: "webhook" }>; onChange: (s: FlowStep) => void }) {
  return (
    <div className="flex flex-col gap-2 mt-3">
      <div className="flex gap-2">
        <select value={step.method} onChange={(e) => onChange({ ...step, method: e.target.value })}
          className="px-2.5 py-1.5 rounded-lg text-xs outline-none w-24 shrink-0"
          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}>
          {["POST","GET","PUT","PATCH"].map((m) => <option key={m}>{m}</option>)}
        </select>
        <input value={step.url} onChange={(e) => onChange({ ...step, url: e.target.value })}
          placeholder="https://example.com/webhook"
          className="flex-1 px-2.5 py-1.5 rounded-lg text-xs outline-none font-mono"
          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
      </div>
      <textarea value={step.body ?? ""} onChange={(e) => onChange({ ...step, body: e.target.value })}
        rows={3} placeholder={'{"id": "{{id}}", "status": "{{status}}"}'}
        className="w-full px-2.5 py-1.5 rounded-lg text-xs font-mono outline-none resize-none"
        style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Use {"{{fieldName}}"} to inject record values into the body.</p>
    </div>
  );
}

function CreateRecordForm({ step, onChange, collections }: {
  step: Extract<FlowStep, { type: "create_record" }>; onChange: (s: FlowStep) => void; collections: Collection[];
}) {
  return (
    <div className="flex flex-col gap-2 mt-3">
      <select value={step.collectionId} onChange={(e) => onChange({ ...step, collectionId: e.target.value })}
        className="px-2.5 py-1.5 rounded-lg text-xs outline-none"
        style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}>
        <option value="">Select collection…</option>
        {collections.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
      <textarea value={step.data} onChange={(e) => onChange({ ...step, data: e.target.value })}
        rows={4} placeholder={'{"title": "{{title}}", "source": "flow"}'}
        className="w-full px-2.5 py-1.5 rounded-lg text-xs font-mono outline-none resize-none"
        style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>JSON data for new record. Use {"{{fieldName}}"} for dynamic values.</p>
    </div>
  );
}

function LogForm({ step, onChange }: { step: Extract<FlowStep, { type: "log" }>; onChange: (s: FlowStep) => void }) {
  return (
    <div className="mt-3">
      <input value={step.message} onChange={(e) => onChange({ ...step, message: e.target.value })}
        placeholder="Record {{id}} processed."
        className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none"
        style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
    </div>
  );
}

/* ── Step card ───────────────────────────────────────────── */
function StepCard({ step, index, onChange, onDelete, collections }: {
  step: FlowStep; index: number;
  onChange: (s: FlowStep) => void;
  onDelete: () => void;
  collections: Collection[];
}) {
  const [expanded, setExpanded] = useState(true);
  const Icon  = STEP_ICONS[step.type] ?? Zap;
  const color = STEP_COLORS[step.type] ?? "#888";

  return (
    <div className="rounded-xl overflow-hidden"
      style={{ border: `1px solid ${color}40`, background: "var(--bg-surface)" }}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
        style={{ borderBottom: expanded ? `1px solid ${color}30` : "none" }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${color}18`, color }}>
          <Icon size={13} />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>
          {step.type.replace("_", " ")}
        </span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>Step {index + 1}</span>
        <div className="flex-1" />
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px]"
          style={{ color: "var(--danger)", background: "color-mix(in srgb, var(--danger) 10%, transparent)" }}>
          <Trash2 size={10} /> Remove
        </button>
        {expanded ? <ChevronUp size={14} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />}
      </div>

      {expanded && (
        <div className="px-4 pb-4">
          {step.type === "condition"     && <ConditionForm     step={step} onChange={onChange} />}
          {step.type === "webhook"       && <WebhookForm       step={step} onChange={onChange} />}
          {step.type === "create_record" && <CreateRecordForm  step={step} onChange={onChange} collections={collections} />}
          {step.type === "log"           && <LogForm           step={step} onChange={onChange} />}
        </div>
      )}
    </div>
  );
}

/* ── Add step menu ───────────────────────────────────────── */
function AddStepMenu({ onAdd }: { onAdd: (type: FlowStep["type"]) => void }) {
  const [open, setOpen] = useState(false);
  const options: { type: FlowStep["type"]; label: string }[] = [
    { type: "condition",     label: "Condition" },
    { type: "webhook",       label: "Webhook" },
    { type: "create_record", label: "Create Record" },
    { type: "log",           label: "Log Message" },
  ];

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full justify-center py-3 rounded-xl text-sm font-medium transition-all border-dashed"
        style={{ border: "1.5px dashed var(--border)", color: "var(--text-muted)", background: "var(--bg-surface)" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--primary)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--primary)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
      >
        <Plus size={15} /> Add Step
      </button>
      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-10 rounded-xl overflow-hidden shadow-lg"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", minWidth: "180px" }}>
          {options.map((o) => {
            const Icon  = STEP_ICONS[o.type];
            const color = STEP_COLORS[o.type];
            return (
              <button key={o.type}
                onClick={() => { onAdd(o.type); setOpen(false); }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left"
                style={{ color: "var(--text-soft)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-overlay)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                <Icon size={14} color={color} /> {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Run history ─────────────────────────────────────────── */
function RunHistory({ runs }: { runs: FlowRun[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (!runs.length) return (
    <p className="text-xs text-center py-6" style={{ color: "var(--text-muted)" }}>No runs yet.</p>
  );

  return (
    <div className="flex flex-col gap-1">
      {runs.map((run) => {
        const logs: string[] = (() => { try { return JSON.parse(run.log); } catch { return []; } })();
        return (
          <div key={run.id} className="rounded-lg overflow-hidden"
            style={{ border: "1px solid var(--border)", background: "var(--bg-surface)" }}>
            <div className="flex items-center gap-3 px-4 py-2.5 cursor-pointer"
              onClick={() => setExpanded(expanded === run.id ? null : run.id)}>
              {run.status === "success"
                ? <CheckCircle2 size={14} style={{ color: "#22c55e" }} />
                : run.status === "running"
                  ? <Loader2 size={14} className="animate-spin" style={{ color: "var(--primary)" }} />
                  : <XCircle size={14} style={{ color: "#ef4444" }} />}
              <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                {new Date(run.startedAt).toLocaleString()}
              </span>
              {run.endedAt && (
                <span className="text-[10px] ml-auto flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                  <Clock size={10} />
                  {Math.round((new Date(run.endedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}s
                </span>
              )}
            </div>
            {expanded === run.id && logs.length > 0 && (
              <div className="px-4 pb-3 pt-0">
                <pre className="text-[10px] font-mono leading-relaxed whitespace-pre-wrap"
                  style={{ color: "var(--text-muted)" }}>
                  {logs.join("\n")}
                </pre>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Main editor ─────────────────────────────────────────── */
export default function FlowEditor({ flow, collections }: { flow: Flow; collections: Collection[] }) {
  const router = useRouter();
  const [name, setName]     = useState(flow.name);
  const [active, setActive] = useState(flow.active);
  const [steps, setSteps]   = useState<FlowStep[]>(() => {
    try { return JSON.parse(flow.steps); } catch { return []; }
  });
  const [isSaving, startSave]   = useTransition();
  const [isRunning, startRun]   = useTransition();

  let trigger: TriggerConfig = { type: "manual" };
  try { trigger = JSON.parse(flow.trigger); } catch { /* empty */ }

  const trigColor = TRIGGER_COLORS[trigger.type] ?? "#888";

  function addStep(type: FlowStep["type"]) {
    const id = `step_${Date.now()}`;
    let newStep: FlowStep;
    switch (type) {
      case "condition":     newStep = { id, type, field: "", op: "eq", value: "" }; break;
      case "webhook":       newStep = { id, type, url: "", method: "POST", body: "" }; break;
      case "create_record": newStep = { id, type, collectionId: "", data: "{}" }; break;
      case "log":           newStep = { id, type, message: "" }; break;
    }
    setSteps((s) => [...s, newStep]);
  }

  function updateStep(index: number, s: FlowStep) {
    setSteps((prev) => prev.map((p, i) => (i === index ? s : p)));
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSave() {
    startSave(async () => {
      await updateFlow(flow.id, { name, active, steps });
      router.refresh();
    });
  }

  function handleRun() {
    startRun(async () => {
      await runFlowManually(flow.id);
      router.refresh();
    });
  }

  return (
    <div className="p-6 max-w-3xl mx-auto flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
        <Link href="/flows" className="flex items-center gap-1 hover:text-(--text) transition-colors">
          <ArrowLeft size={13} /> Flows
        </Link>
        <span>/</span>
        <span style={{ color: "var(--text)" }}>{flow.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 text-xl font-bold px-2 py-1 rounded-lg outline-none"
          style={{ background: "transparent", color: "var(--text)", border: "1px solid transparent" }}
          onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLInputElement).style.background = "var(--bg-raised)"; }}
          onBlur={(e)  => { (e.currentTarget as HTMLInputElement).style.borderColor = "transparent"; (e.currentTarget as HTMLInputElement).style.background = "transparent"; }}
        />

        <button onClick={() => setActive((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0"
          style={{
            background: active ? "color-mix(in srgb, #22c55e 15%, transparent)" : "var(--bg-raised)",
            color: active ? "#22c55e" : "var(--text-muted)",
            border: `1px solid ${active ? "#22c55e40" : "var(--border)"}`,
          }}>
          {active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
          {active ? "Active" : "Inactive"}
        </button>

        {trigger.type === "manual" && (
          <button onClick={handleRun} disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 disabled:opacity-60"
            style={{ background: "var(--bg-raised)", color: "var(--text-soft)", border: "1px solid var(--border)" }}>
            {isRunning ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
            Run
          </button>
        )}

        <button onClick={handleSave} disabled={isSaving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold shrink-0 disabled:opacity-60"
          style={{ background: "var(--primary)", color: "var(--text-inverse)" }}>
          {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Save
        </button>
      </div>

      {/* Flow canvas */}
      <div className="flex flex-col gap-3">
        {/* Trigger card */}
        <div className="rounded-xl px-4 py-4"
          style={{ border: `1.5px solid ${trigColor}60`, background: `${trigColor}0a` }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: `${trigColor}20`, color: trigColor }}>
              <Zap size={15} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: trigColor }}>Trigger</p>
              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                {{
                  "record.create": "Record Created",
                  "record.update": "Record Updated",
                  "record.delete": "Record Deleted",
                  "manual": "Manual",
                }[trigger.type]}
                {trigger.collectionName && (
                  <span className="ml-2 text-xs font-normal" style={{ color: "var(--text-muted)" }}>
                    in {trigger.collectionName}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Connector */}
        {steps.length > 0 && (
          <div className="flex justify-center">
            <div className="w-px h-4" style={{ background: "var(--border)" }} />
          </div>
        )}

        {/* Steps */}
        {steps.map((step, i) => (
          <div key={step.id}>
            <StepCard
              step={step} index={i}
              onChange={(s) => updateStep(i, s)}
              onDelete={() => removeStep(i)}
              collections={collections}
            />
            {i < steps.length - 1 && (
              <div className="flex justify-center mt-3">
                <div className="w-px h-4" style={{ background: "var(--border)" }} />
              </div>
            )}
          </div>
        ))}

        {/* Add step */}
        {steps.length > 0 && (
          <div className="flex justify-center mt-1">
            <div className="w-px h-4" style={{ background: "var(--border)" }} />
          </div>
        )}
        <AddStepMenu onAdd={addStep} />
      </div>

      {/* Run history */}
      <div className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--border)", background: "var(--bg-surface)" }}>
        <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            Run History <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>({flow.runCount} total)</span>
          </p>
        </div>
        <div className="p-3">
          <RunHistory runs={flow.runs} />
        </div>
      </div>
    </div>
  );
}

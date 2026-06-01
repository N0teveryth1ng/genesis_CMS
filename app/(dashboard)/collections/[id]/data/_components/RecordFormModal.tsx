"use client";

import { useState, useTransition, useEffect } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";
import { createRecord, updateRecord, getRecordLabels } from "@/lib/actions/collections";
import { createGitRecord, updateGitRecord } from "@/lib/actions/git";
import type { Collection, Field, Record as PrismaRecord } from "@prisma/client";

type CollectionWithFields = Collection & { fields: Field[]; isGitBacked?: boolean };

interface SelectOption { label: string; value: string }
interface RelationMeta { targetCollectionId: string; targetCollectionName: string; relationType: "one" | "many" }

function parseOptions(raw: string | null): SelectOption[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as SelectOption[]; } catch { return []; }
}

function parseRelationMeta(raw: string | null): RelationMeta | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as RelationMeta; } catch { return null; }
}

/* ── Relation input ──────────────────────────────────────── */
function RelationInput({ field, value, onChange }: {
  field: Field; value: unknown; onChange: (v: unknown) => void;
}) {
  const meta = parseRelationMeta(field.options);
  const [options, setOptions] = useState<{ id: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!meta?.targetCollectionId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    getRecordLabels(meta.targetCollectionId).then((rows) => {
      setOptions(rows);
      setLoading(false);
    });
  }, [meta?.targetCollectionId]);

  if (!meta) return <p className="text-xs" style={{ color: "var(--danger)" }}>Invalid relation config</p>;

  if (meta.relationType === "many") {
    const selected: string[] = Array.isArray(value) ? (value as string[]) : [];
    function toggle(id: string) {
      onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
    }
    return (
      <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto rounded-lg"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        {loading ? (
          <div className="p-3 flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
            <Loader2 size={12} className="animate-spin" /> Loading records…
          </div>
        ) : options.length === 0 ? (
          <p className="p-3 text-xs" style={{ color: "var(--text-muted)" }}>No records in target collection.</p>
        ) : options.map((o) => (
          <label key={o.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors"
            style={{ borderBottom: "1px solid var(--border)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLLabelElement).style.background = "var(--bg-overlay)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLLabelElement).style.background = "transparent"; }}>
            <input type="checkbox" checked={selected.includes(o.id)} onChange={() => toggle(o.id)}
              className="accent-(--primary)" />
            <span className="text-sm" style={{ color: "var(--text)" }}>{o.label}</span>
            <span className="text-[10px] font-mono ml-auto" style={{ color: "var(--text-muted)" }}>{o.id.slice(0, 6)}</span>
          </label>
        ))}
      </div>
    );
  }

  /* Many-to-one: single select */
  return (
    <select
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg px-3 py-2.5 text-sm outline-none w-full"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
    >
      <option value="">— None —</option>
      {loading ? <option disabled>Loading…</option> : options.map((o) => (
        <option key={o.id} value={o.id}>{o.label}</option>
      ))}
    </select>
  );
}

function parseRecordData(record: PrismaRecord | null): Record<string, unknown> {
  if (!record) return {};
  try { return JSON.parse(record.data); } catch { return {}; }
}

/* ── Field input renderer ────────────────────────────────── */
function FieldInput({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const str = value === null || value === undefined ? "" : String(value);
  const baseInput =
    "rounded-lg px-3 py-2.5 text-sm outline-none transition-all w-full";
  const baseStyle = {
    background: "var(--bg-surface)",
    border:     "1px solid var(--border)",
    color:      "var(--text)",
  };

  switch (field.type) {
    case "textarea":
      return (
        <textarea
          rows={3}
          value={str}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.defaultValue ?? ""}
          className={baseInput}
          style={baseStyle}
          onFocus={(e) => { e.target.style.borderColor = "var(--primary)"; }}
          onBlur={(e)  => { e.target.style.borderColor = "var(--border)"; }}
        />
      );

    case "boolean":
      return (
        <button
          type="button"
          onClick={() => onChange(!value)}
          className="relative flex-shrink-0 w-10 h-5 rounded-full transition-all duration-200"
          style={{ background: value ? "var(--primary)" : "var(--border-light)" }}
        >
          <span
            className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200"
            style={{
              background: "#fff",
              left:       value ? "calc(100% - 18px)" : "2px",
              boxShadow:  "0 1px 3px rgba(0,0,0,0.3)",
            }}
          />
        </button>
      );

    case "number":
      return (
        <input
          type="number"
          value={str}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          placeholder={field.defaultValue ?? "0"}
          className={baseInput}
          style={baseStyle}
          onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--primary)"; }}
          onBlur={(e)  => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
        />
      );

    case "date":
      return (
        <input
          type="date"
          value={str}
          onChange={(e) => onChange(e.target.value)}
          className={baseInput}
          style={baseStyle}
          onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--primary)"; }}
          onBlur={(e)  => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
        />
      );

    case "datetime":
      return (
        <input
          type="datetime-local"
          value={str}
          onChange={(e) => onChange(e.target.value)}
          className={baseInput}
          style={baseStyle}
          onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--primary)"; }}
          onBlur={(e)  => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
        />
      );

    case "email":
      return (
        <input
          type="email"
          value={str}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.defaultValue ?? "user@example.com"}
          className={baseInput}
          style={baseStyle}
          onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--primary)"; }}
          onBlur={(e)  => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
        />
      );

    case "url":
      return (
        <input
          type="url"
          value={str}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.defaultValue ?? "https://"}
          className={baseInput}
          style={baseStyle}
          onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--primary)"; }}
          onBlur={(e)  => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
        />
      );

    case "password":
      return (
        <input
          type="password"
          value={str}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          className={baseInput}
          style={baseStyle}
          onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--primary)"; }}
          onBlur={(e)  => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
        />
      );

    case "select": {
      const opts = parseOptions(field.options);
      return (
        <select
          value={str}
          onChange={(e) => onChange(e.target.value)}
          className={baseInput}
          style={{ ...baseStyle, cursor: "pointer" }}
        >
          <option value="">— Select —</option>
          {opts.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
    }

    case "json":
      return (
        <textarea
          rows={4}
          value={str}
          onChange={(e) => onChange(e.target.value)}
          placeholder="{}"
          className={`${baseInput} font-mono text-xs`}
          style={baseStyle}
          onFocus={(e) => { e.target.style.borderColor = "var(--primary)"; }}
          onBlur={(e)  => { e.target.style.borderColor = "var(--border)"; }}
        />
      );

    case "uuid":
      return (
        <input
          type="text"
          value={str}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Auto-generated if empty"
          className={`${baseInput} font-mono text-xs`}
          style={{ ...baseStyle, color: "var(--text-muted)" }}
          onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--primary)"; }}
          onBlur={(e)  => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
        />
      );

    case "relation":
      return <RelationInput field={field} value={value} onChange={onChange} />;

    default:
      return (
        <input
          type="text"
          value={str}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.defaultValue ?? ""}
          className={baseInput}
          style={baseStyle}
          onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--primary)"; }}
          onBlur={(e)  => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
        />
      );
  }
}

/* ── Modal ───────────────────────────────────────────────── */
export default function RecordFormModal({
  collection,
  record,
  onClose,
}: {
  collection: CollectionWithFields;
  record: PrismaRecord | null;
  onClose: () => void;
}) {
  const editing = !!record;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const initialData = parseRecordData(record);
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {};
    for (const f of collection.fields) {
      init[f.name] = initialData[f.name] ?? f.defaultValue ?? (f.type === "boolean" ? false : "");
    }
    return init;
  });

  function setValue(name: string, v: unknown) {
    setValues((prev) => ({ ...prev, [name]: v }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    /* Basic required validation */
    for (const f of collection.fields) {
      if (f.required && (values[f.name] === "" || values[f.name] === null || values[f.name] === undefined)) {
        setError(`"${f.label}" is required`);
        return;
      }
    }

    const isGit = !!collection.isGitBacked;

    startTransition(async () => {
      try {
        if (editing) {
          if (isGit) {
            await updateGitRecord(record!.id, collection.id, values);
          } else {
            await updateRecord(record!.id, collection.id, values);
          }
        } else {
          if (isGit) {
            await createGitRecord(collection.id, values);
          } else {
            await createRecord(collection.id, values);
          }
        }
        onClose();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }


  return (
    <div
      className="fixed inset-0 z-200 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl flex flex-col max-h-[90vh]"
        style={{
          background: "var(--bg-raised)",
          border:     "1px solid var(--border-light)",
          boxShadow:  "var(--shadow-lg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: "var(--border)" }}>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              {editing ? "Edit Record" : "New Record"}
            </h2>
            {editing && (
              <p className="text-[11px] font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>
                {record!.id}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-overlay)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6 overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2.5 rounded-lg px-4 py-3 text-sm"
              style={{ background: "rgba(255,77,106,0.1)", border: "1px solid rgba(255,77,106,0.2)", color: "var(--danger)" }}>
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {collection.fields.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>
              No fields defined for this collection.
            </p>
          ) : (
            collection.fields.map((f) => (
              <div key={f.id} className="flex flex-col gap-1.5">
                <label className="text-xs font-medium flex items-center gap-1" style={{ color: "var(--text-soft)" }}>
                  {f.label}
                  {f.required && <span style={{ color: "var(--danger)" }}>*</span>}
                  <span className="ml-auto text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                    {f.type}
                  </span>
                </label>
                <FieldInput field={f} value={values[f.name]} onChange={(v) => setValue(f.name, v)} />
              </div>
            ))
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg py-2.5 text-sm font-medium"
              style={{ background: "var(--bg-overlay)", color: "var(--text-soft)", border: "1px solid var(--border)" }}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || collection.fields.length === 0}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50"
              style={{ background: "var(--primary)", color: "var(--text-inverse)" }}
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {isPending ? "Saving…" : editing ? "Save Changes" : "Create Record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

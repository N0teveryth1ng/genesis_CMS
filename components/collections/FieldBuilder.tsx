"use client";

import { useRef, useState, useTransition } from "react";
import { X, Loader2, AlertCircle, Plus, Trash2 } from "lucide-react";
import { createField, updateField, getCollections } from "@/lib/actions/collections";
import type { Field } from "@prisma/client";

/* ── Field types ─────────────────────────────────────────── */
const FIELD_TYPES = [
  { value: "text",      label: "Text",      desc: "Short text string"        },
  { value: "textarea",  label: "Long Text",  desc: "Multi-line text"         },
  { value: "number",    label: "Number",     desc: "Integer or decimal"       },
  { value: "boolean",   label: "Boolean",    desc: "True / false toggle"     },
  { value: "date",      label: "Date",       desc: "Date only"               },
  { value: "datetime",  label: "Datetime",   desc: "Date and time"           },
  { value: "email",     label: "Email",      desc: "Validated email address"  },
  { value: "url",       label: "URL",        desc: "Validated URL"            },
  { value: "password",  label: "Password",   desc: "Hashed secret field"     },
  { value: "select",    label: "Select",     desc: "Dropdown with options"   },
  { value: "relation",  label: "Relation",   desc: "Link to another collection" },
  { value: "json",      label: "JSON",       desc: "Raw JSON object"          },
  { value: "uuid",      label: "UUID",       desc: "Auto-generated UUID"     },
] as const;

type FieldTypeValue = (typeof FIELD_TYPES)[number]["value"];

interface SelectOption { label: string; value: string }
interface RelationMeta { targetCollectionId: string; targetCollectionName: string; relationType: "one" | "many" }

interface Props {
  collectionId: string;
  field?: Field | null;
  onClose: () => void;
}

function Toggle({ checked, onChange, label, desc }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; desc: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{label}</p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{desc}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="relative flex-shrink-0 w-10 h-5 rounded-full transition-all duration-200"
        style={{ background: checked ? "var(--primary)" : "var(--border-light)" }}
      >
        <span
          className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200"
          style={{
            background: "#fff",
            left:       checked ? "calc(100% - 18px)" : "2px",
            boxShadow:  "0 1px 3px rgba(0,0,0,0.3)",
          }}
        />
      </button>
    </div>
  );
}

export default function FieldBuilder({ collectionId, field, onClose }: Props) {
  const editing  = !!field;
  const formRef  = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error,     setError]        = useState<string | null>(null);

  const [label,    setLabel]    = useState(field?.label        ?? "");
  const [type,     setType]     = useState<FieldTypeValue>((field?.type as FieldTypeValue) ?? "text");
  const [required, setRequired] = useState(field?.required     ?? false);
  const [unique,   setUnique]   = useState(field?.unique       ?? false);
  const [hidden,   setHidden]   = useState(field?.hidden       ?? false);
  const [defVal,   setDefVal]   = useState(field?.defaultValue ?? "");

  /* Select options */
  const initialOpts: SelectOption[] = (() => {
    if (field?.options && field.type === "select") {
      try { return JSON.parse(field.options) as SelectOption[]; } catch { return []; }
    }
    return [{ label: "", value: "" }];
  })();
  const [options, setOptions] = useState<SelectOption[]>(initialOpts);

  /* Relation meta */
  const initialRelation: RelationMeta = (() => {
    if (field?.options && field.type === "relation") {
      try { return JSON.parse(field.options) as RelationMeta; } catch { /* empty */ }
    }
    return { targetCollectionId: "", targetCollectionName: "", relationType: "one" };
  })();
  const [relation, setRelation] = useState<RelationMeta>(initialRelation);

  /* Available collections for relation picker */
  const [collections, setCollections] = useState<{ id: string; name: string; label: string }[]>([]);
  const [loadingCols, setLoadingCols] = useState(false);

  async function loadCollections() {
    if (collections.length > 0) return;
    setLoadingCols(true);
    const cols = await getCollections();
    setCollections(cols.filter((c) => c.id !== collectionId).map((c) => ({ id: c.id, name: c.name, label: c.label })));
    setLoadingCols(false);
  }

  function addOption()             { setOptions([...options, { label: "", value: "" }]); }
  function removeOption(i: number) { setOptions(options.filter((_, idx) => idx !== i)); }
  function updateOption(i: number, key: "label" | "value", val: string) {
    setOptions(options.map((o, idx) => idx === i ? { ...o, [key]: val } : o));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const data = new FormData(formRef.current!);
    data.set("required", String(required));
    data.set("unique",   String(unique));
    data.set("hidden",   String(hidden));

    if (type === "select") {
      data.set("options", JSON.stringify(options.filter((o) => o.value)));
    }
    if (type === "relation") {
      if (!relation.targetCollectionId) { setError("Please select a target collection"); return; }
      data.set("options", JSON.stringify(relation));
    }

    startTransition(async () => {
      try {
        if (editing) {
          await updateField(field!.id, collectionId, data);
        } else {
          await createField(collectionId, data);
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
        className="w-full max-w-lg rounded-2xl animate-fade-in flex flex-col max-h-[90vh]"
        style={{ background: "var(--bg-raised)", border: "1px solid var(--border-light)", boxShadow: "var(--shadow-lg)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            {editing ? "Edit Field" : "Add Field"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-overlay)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}>
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-5 p-6 overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2.5 rounded-lg px-4 py-3 text-sm"
              style={{ background: "rgba(255,77,106,0.1)", border: "1px solid rgba(255,77,106,0.2)", color: "var(--danger)" }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {/* Label */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>
              Label <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <input
              name="label" required value={label} onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Title"
              className="rounded-lg px-3 py-2.5 text-sm outline-none transition-all"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
              onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--primary)"; }}
              onBlur={(e)  => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
            />
          </div>

          {/* Field type */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>Type</label>
            <input type="hidden" name="type" value={type} />
            <div className="grid grid-cols-3 gap-2">
              {FIELD_TYPES.map(({ value, label: tLabel, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setType(value);
                    if (value === "relation") loadCollections();
                  }}
                  className="flex flex-col items-start gap-0.5 rounded-lg px-3 py-2.5 text-left transition-all"
                  style={{
                    background: type === value ? "var(--primary-dim)"   : "var(--bg-surface)",
                    border:     `1px solid ${type === value ? "var(--primary)" : "var(--border)"}`,
                  }}
                >
                  <span className="text-xs font-semibold" style={{ color: type === value ? "var(--primary)" : "var(--text)" }}>
                    {tLabel}
                  </span>
                  <span className="text-[10px] leading-tight" style={{ color: "var(--text-muted)" }}>{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Select options */}
          {type === "select" && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>Options</label>
              <div className="flex flex-col gap-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      placeholder="Label" value={opt.label} onChange={(e) => updateOption(i, "label", e.target.value)}
                      className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                    />
                    <input
                      placeholder="Value" value={opt.value} onChange={(e) => updateOption(i, "value", e.target.value)}
                      className="flex-1 rounded-lg px-3 py-2 text-sm outline-none font-mono"
                      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                    />
                    <button type="button" onClick={() => removeOption(i)} className="p-2 rounded-lg" style={{ color: "var(--danger)" }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addOption}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg w-fit"
                  style={{ background: "var(--bg-overlay)", color: "var(--text-soft)" }}>
                  <Plus size={12} /> Add option
                </button>
              </div>
            </div>
          )}

          {/* Relation config */}
          {type === "relation" && (
            <div className="flex flex-col gap-3">
              <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>Relation settings</label>

              {/* Target collection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs" style={{ color: "var(--text-muted)" }}>Target collection</label>
                {loadingCols ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm"
                    style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                    <Loader2 size={13} className="animate-spin" /> Loading collections…
                  </div>
                ) : (
                  <select
                    value={relation.targetCollectionId}
                    onChange={(e) => {
                      const col = collections.find((c) => c.id === e.target.value);
                      setRelation({ ...relation, targetCollectionId: e.target.value, targetCollectionName: col?.name ?? "" });
                    }}
                    className="rounded-lg px-3 py-2.5 text-sm outline-none"
                    style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                  >
                    <option value="">— Select collection —</option>
                    {collections.map((c) => (
                      <option key={c.id} value={c.id}>{c.label} ({c.name})</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Relation type */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs" style={{ color: "var(--text-muted)" }}>Relation type</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "one",  label: "Many-to-One",  desc: "Each record links to one target" },
                    { value: "many", label: "Many-to-Many", desc: "Each record links to many targets" },
                  ].map(({ value, label: rLabel, desc }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRelation({ ...relation, relationType: value as "one" | "many" })}
                      className="flex flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left transition-all"
                      style={{
                        background: relation.relationType === value ? "var(--primary-dim)" : "var(--bg-surface)",
                        border:     `1px solid ${relation.relationType === value ? "var(--primary)" : "var(--border)"}`,
                      }}
                    >
                      <span className="text-xs font-semibold" style={{ color: relation.relationType === value ? "var(--primary)" : "var(--text)" }}>
                        {rLabel}
                      </span>
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Default value */}
          {!["boolean", "json", "uuid", "password", "relation"].includes(type) && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>Default value</label>
              <input
                name="defaultValue" value={defVal} onChange={(e) => setDefVal(e.target.value)}
                placeholder="Optional default"
                className="rounded-lg px-3 py-2.5 text-sm outline-none transition-all"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--primary)"; }}
                onBlur={(e)  => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
              />
            </div>
          )}

          {/* Toggles */}
          <div className="flex flex-col gap-4 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
            <Toggle checked={required} onChange={setRequired} label="Required" desc="This field must have a value" />
            {type !== "relation" && (
              <Toggle checked={unique} onChange={setUnique} label="Unique" desc="No two records can share this value" />
            )}
            <Toggle checked={hidden}   onChange={setHidden}   label="Hidden"   desc="Hide this field in the data browser" />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg py-2.5 text-sm font-medium"
              style={{ background: "var(--bg-overlay)", color: "var(--text-soft)", border: "1px solid var(--border)" }}>
              Cancel
            </button>
            <button type="submit" disabled={isPending || !label.trim()}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50"
              style={{ background: "var(--primary)", color: "var(--text-inverse)" }}>
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {isPending ? "Saving…" : editing ? "Save Changes" : "Add Field"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

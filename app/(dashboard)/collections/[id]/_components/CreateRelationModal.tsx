"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, Link2, ArrowRight, ArrowLeftRight } from "lucide-react";
import { createRelation } from "@/lib/actions/relations";

type CollectionOption = { id: string; name: string; label: string };

const TYPE_META = {
  m2o: {
    label: "Many-to-One",
    icon:  ArrowRight,
    desc:  "Many records in this collection belong to one record in another.",
    example: "Posts → Author",
  },
  o2m: {
    label: "One-to-Many",
    icon:  ArrowRight,
    desc:  "One record here has many related records in another collection. Virtual — no column added.",
    example: "Author → Posts",
  },
  m2m: {
    label: "Many-to-Many",
    icon:  ArrowLeftRight,
    desc:  "Records in both collections can be linked to multiple records in each other. Creates a junction table.",
    example: "Posts ↔ Tags",
  },
} as const;

type RelType = keyof typeof TYPE_META;

export default function CreateRelationModal({
  collectionId,
  collectionLabel,
  collections,
  onClose,
}: {
  collectionId:    string;
  collectionLabel: string;
  collections:     CollectionOption[];
  onClose:         () => void;
}) {
  const router = useRouter();
  const [type,         setType]         = useState<RelType>("m2o");
  const [relatedId,    setRelatedId]    = useState("");
  const [fieldName,    setFieldName]    = useState("");
  const [isPending,    startTransition] = useTransition();
  const [error,        setError]        = useState("");

  const others = collections.filter((c) => c.id !== collectionId);

  function handleRelatedChange(id: string) {
    setRelatedId(id);
    const target = others.find((c) => c.id === id);
    if (!target) return;
    // Auto-generate a sensible field name
    if (type === "m2o") setFieldName(`${target.name}_id`);
    else if (type === "m2m") setFieldName(`${target.name}s`);
    else setFieldName(`${target.name}s`);
  }

  function handleTypeChange(t: RelType) {
    setType(t);
    const target = others.find((c) => c.id === relatedId);
    if (!target) return;
    if (t === "m2o") setFieldName(`${target.name}_id`);
    else setFieldName(`${target.name}s`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!relatedId)  { setError("Select a target collection."); return; }
    if (!fieldName)  { setError("Field name is required.");     return; }

    startTransition(async () => {
      try {
        await createRelation({ type, collectionId, fieldName, relatedCollectionId: relatedId });
        router.refresh();
        onClose();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to create relation");
      }
    });
  }

  const TypeIcon = TYPE_META[type].icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
              <Link2 size={16} />
            </div>
            <p className="text-sm font-bold" style={{ color: "var(--text)" }}>Add Relationship</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg"
            style={{ color: "var(--text-muted)", background: "var(--bg-raised)" }}>
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 py-5">
          {/* Relation type */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}>
              Relationship Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(TYPE_META) as [RelType, typeof TYPE_META[RelType]][]).map(([key, meta]) => {
                const Icon = meta.icon;
                const active = type === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleTypeChange(key)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-center transition-all cursor-pointer"
                    style={{
                      border:     `2px solid ${active ? "var(--primary)" : "var(--border)"}`,
                      background: active ? "rgba(0,200,248,0.06)" : "var(--bg-raised)",
                      color:      active ? "var(--primary)" : "var(--text-soft)",
                    }}
                  >
                    <Icon size={16} />
                    <span className="text-[11px] font-bold">{meta.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {TYPE_META[type].desc}
              <span className="ml-1 font-mono" style={{ color: "var(--text-soft)" }}>e.g. {TYPE_META[type].example}</span>
            </p>
          </div>

          {/* From → To */}
          <div className="flex items-center gap-3">
            <div className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold text-center"
              style={{ background: "var(--primary-dim)", color: "var(--primary)", border: "1px solid rgba(0,200,248,0.2)" }}>
              {collectionLabel}
            </div>
            <TypeIcon size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <div className="flex-1">
              <select
                value={relatedId}
                onChange={(e) => handleRelatedChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
                style={{
                  background: "var(--bg-raised)",
                  border:     "1px solid var(--border)",
                  color:      relatedId ? "var(--text)" : "var(--text-muted)",
                }}
              >
                <option value="">Select collection…</option>
                {others.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Field name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}>
              {type === "m2o" ? "FK Field Name" : "Display Field Name"}
            </label>
            <input
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
              placeholder={type === "m2o" ? "author_id" : "tags"}
              className="px-3 py-2 rounded-lg text-sm font-mono outline-none"
              style={{
                background: "var(--bg-raised)",
                border:     "1px solid var(--border)",
                color:      "var(--text)",
              }}
            />
            {type === "m2o" && (
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                A column with this name will be added to <span className="font-mono">{collectionLabel}</span>&apos;s table.
              </p>
            )}
            {type === "m2m" && (
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                A junction table will be created to link both collections.
              </p>
            )}
            {type === "o2m" && (
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                Virtual — no column is added. Used only for API population.
              </p>
            )}
          </div>

          {error && (
            <p className="text-xs px-3 py-2 rounded-lg"
              style={{ background: "rgba(255,77,106,0.08)", color: "var(--danger)", border: "1px solid rgba(255,77,106,0.2)" }}>
              {error}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-1"
            style={{ borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
              style={{ background: "var(--bg-raised)", color: "var(--text-soft)", border: "1px solid var(--border)" }}>
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-40"
              style={{ background: "var(--primary)", color: "var(--text-inverse)" }}>
              {isPending ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />}
              Create Relation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Link2, Trash2, Loader2, ArrowRight, ArrowLeftRight } from "lucide-react";
import CreateRelationModal from "./CreateRelationModal";
import { deleteRelation } from "@/lib/actions/relations";
import type { RelationWithCollections } from "@/lib/actions/relations";

type CollectionOption = { id: string; name: string; label: string };

const TYPE_LABEL: Record<string, string>  = { m2o: "Many-to-One", o2m: "One-to-Many", m2m: "Many-to-Many" };
const TYPE_COLOR: Record<string, string>  = { m2o: "#64b5f6", o2m: "#81c784", m2m: "#ce93d8" };

function RelationRow({
  rel,
  currentCollectionId,
}: {
  rel: RelationWithCollections;
  currentCollectionId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming]  = useState(false);
  const color = TYPE_COLOR[rel.type] ?? "var(--text-soft)";

  const isOwner = rel.collectionId === currentCollectionId;
  const fromLabel = isOwner ? rel.collection.label        : rel.relatedCollection.label;
  const toLabel   = isOwner ? rel.relatedCollection.label : rel.collection.label;

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirming) { setConfirming(true); return; }
    startTransition(async () => {
      await deleteRelation(rel.id);
      router.refresh();
    });
  }

  return (
    <div
      className="group flex items-center gap-4 px-5 py-3.5 transition-colors"
      style={{ borderBottom: "1px solid var(--border)" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--bg-overlay)"; }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = "transparent";
        setConfirming(false);
      }}
    >
      {/* Color bar */}
      <div className="w-1 h-6 rounded-full shrink-0" style={{ background: color }} />

      {/* Field name */}
      <div className="w-36 shrink-0">
        <p className="text-sm font-medium font-mono" style={{ color: "var(--text)" }}>{rel.fieldName}</p>
        {rel.junctionTable && (
          <p className="text-[10px] font-mono truncate" style={{ color: "var(--text-muted)" }}>
            via {rel.junctionTable}
          </p>
        )}
      </div>

      {/* From → To */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-xs px-2 py-0.5 rounded font-mono"
          style={{ background: "var(--bg-raised)", color: "var(--text-soft)", border: "1px solid var(--border)" }}>
          {fromLabel}
        </span>
        {rel.type === "m2m"
          ? <ArrowLeftRight size={12} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          : <ArrowRight     size={12} style={{ color: "var(--text-muted)", flexShrink: 0 }} />}
        <span className="text-xs px-2 py-0.5 rounded font-mono"
          style={{ background: "var(--bg-raised)", color: "var(--text-soft)", border: "1px solid var(--border)" }}>
          {toLabel}
        </span>
      </div>

      {/* Type badge */}
      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0"
        style={{ background: `${color}22`, color }}>
        {TYPE_LABEL[rel.type] ?? rel.type}
      </span>

      {/* Delete */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium cursor-pointer"
          style={{
            background: confirming ? "var(--danger)" : "var(--bg-raised)",
            color:      confirming ? "#fff"          : "var(--danger)",
          }}
        >
          {isPending ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
          {confirming ? "Sure?" : "Remove"}
        </button>
      </div>
    </div>
  );
}

export default function RelationsSection({
  collectionId,
  collectionLabel,
  relations,
  allCollections,
}: {
  collectionId:    string;
  collectionLabel: string;
  relations:       RelationWithCollections[];
  allCollections:  CollectionOption[];
}) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 size={15} style={{ color: "var(--primary)" }} />
          <p className="text-sm font-bold" style={{ color: "var(--text)" }}>Relationships</p>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
            style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
            {relations.length}
          </span>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
          style={{ background: "var(--primary-dim)", color: "var(--primary)", border: "1px solid rgba(0,200,248,0.2)" }}
        >
          <Plus size={12} /> Add Relation
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--border)", background: "var(--bg-surface)" }}>
        {/* Header */}
        <div className="flex items-center gap-4 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider"
          style={{ background: "var(--bg-raised)", borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>
          <div className="w-1 shrink-0" />
          <div className="w-36 shrink-0">Field</div>
          <div className="flex-1">Collections</div>
          <div className="w-28 shrink-0">Type</div>
          <div className="w-16 shrink-0" />
        </div>

        {relations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No relationships yet.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer"
              style={{ background: "var(--primary-dim)", color: "var(--primary)" }}
            >
              <Plus size={11} className="inline mr-1" />Add your first relation
            </button>
          </div>
        ) : (
          relations.map((rel) => (
            <RelationRow key={rel.id} rel={rel} currentCollectionId={collectionId} />
          ))
        )}
      </div>

      {showCreate && (
        <CreateRelationModal
          collectionId={collectionId}
          collectionLabel={collectionLabel}
          collections={allCollections}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

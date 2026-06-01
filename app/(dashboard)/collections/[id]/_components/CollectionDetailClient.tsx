"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, ArrowLeft, Edit2, Trash2, EyeOff,
  Lock, CheckCircle2, Database, FileText, Users, Image,
  ShoppingCart, Tag, Mail, Calendar, Globe, BarChart2,
  Bookmark, MessageSquare, Package, Star, Heart, Zap, Music,
  Loader2, Hash, Table2, GitBranch,
} from "lucide-react";
import Link from "next/link";
import FieldBuilder from "@/components/collections/FieldBuilder";
import RelationsSection from "./RelationsSection";
import { deleteField } from "@/lib/actions/collections";
import type { Collection, Field } from "@prisma/client";
import type { RelationWithCollections } from "@/lib/actions/relations";

/* ── Icon resolver ───────────────────────────────────────── */
const ICON_MAP: Record<string, React.ElementType> = {
  Database, FileText, Users, Image, ShoppingCart,
  Tag, Mail, Calendar, Globe, BarChart2, Bookmark,
  MessageSquare, Package, Star, Heart, Zap, Music,
};

/* ── Field type badge colors ─────────────────────────────── */
const TYPE_COLORS: Record<string, string> = {
  text:     "var(--primary)",
  textarea: "var(--primary)",
  number:   "var(--accent)",
  boolean:  "var(--success)",
  date:     "var(--warning)",
  datetime: "var(--warning)",
  email:    "var(--info)",
  url:      "var(--info)",
  password: "var(--danger)",
  select:   "var(--accent)",
  json:     "var(--text-soft)",
  uuid:     "var(--text-muted)",
};

type CollectionWithFields = Collection & { fields: Field[]; isGitBacked?: boolean };
type CollectionOption    = { id: string; name: string; label: string };

/* ── Field row ───────────────────────────────────────────── */
function FieldRow({
  field,
  collection,
  onEdit,
}: {
  field: Field;
  collection: CollectionWithFields;
  onEdit: (f: Field) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming]  = useState(false);
  const color = TYPE_COLORS[field.type] ?? "var(--text-soft)";
  const isGit = !!collection.isGitBacked;

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirming) { setConfirming(true); return; }
    startTransition(async () => {
      await deleteField(field.id, collection.id);
      router.refresh();
    });
  }

  return (
    <div
      className="group flex items-center gap-4 px-5 py-3.5 transition-colors"
      style={{
        borderBottom: "1px solid var(--border)",
        background:   "transparent",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--bg-overlay)"; }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = "transparent";
        setConfirming(false);
      }}
    >
      {/* Type color bar */}
      <div className="w-1 h-6 rounded-full shrink-0" style={{ background: color }} />

      {/* Label + name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{field.label}</p>
        <p className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>{field.name}</p>
      </div>

      {/* Type badge */}
      <span
        className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0"
        style={{ background: `${color}18`, color }}
      >
        {field.type}
      </span>

      {/* Flags */}
      <div className="flex items-center gap-2 shrink-0">
        {field.required && (
          <span title="Required">
            <CheckCircle2 size={13} style={{ color: "var(--success)" }} />
          </span>
        )}
        {field.unique && (
          <span title="Unique">
            <Hash size={13} style={{ color: "var(--accent)" }} />
          </span>
        )}
        {field.hidden && (
          <span title="Hidden">
            <EyeOff size={13} style={{ color: "var(--text-muted)" }} />
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 min-w-20 justify-end">
        {isGit ? (
          <span title="Managed in Git schema">
            <Lock size={12} style={{ color: "var(--text-muted)" }} />
          </span>
        ) : (
          <>
            <button
              onClick={() => onEdit(field)}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all cursor-pointer"
              style={{ background: "var(--bg-raised)", color: "var(--text-soft)" }}
            >
              <Edit2 size={11} /> Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all cursor-pointer"
              style={{
                background: confirming ? "var(--danger)" : "var(--bg-raised)",
                color:      confirming ? "#fff"          : "var(--danger)",
              }}
            >
              {isPending ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
              {confirming ? "Sure?" : "Delete"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Collection detail client ────────────────────────────── */
export default function CollectionDetailClient({
  collection,
  relations = [],
  allCollections = [],
}: {
  collection:      CollectionWithFields;
  relations?:      RelationWithCollections[];
  allCollections?: CollectionOption[];
}) {
  const [fieldBuilder, setFieldBuilder] = useState<Field | null | "new">(null);
  const CollIcon = ICON_MAP[collection.icon] ?? Database;
  const isGit = !!collection.isGitBacked;

  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col gap-6">
      {/* Breadcrumb back */}
      <div className="flex items-center gap-3">
        <Link
          href="/collections"
          className="flex items-center gap-1.5 text-sm transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--text)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-muted)"; }}
        >
          <ArrowLeft size={14} /> Collections
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: isGit ? "rgba(0,184,217,0.1)" : "var(--primary-dim)", color: isGit ? "#00B8D9" : "var(--primary)" }}>
            <CollIcon size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
                {collection.label}
              </h1>
              {isGit && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase"
                  style={{ background: "rgba(0,184,217,0.15)", color: "#00B8D9", border: "1px solid rgba(0,184,217,0.2)" }}>
                  <GitBranch size={9} /> Git-Sync
                </span>
              )}
            </div>
            <p className="text-xs font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>
              {collection.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/collections/${collection.id}/data`}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
            style={{ background: "var(--bg-surface)", color: "var(--text)", border: "1px solid var(--border)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--primary)"; (e.currentTarget as HTMLAnchorElement).style.color = "var(--primary)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLAnchorElement).style.color = "var(--text)"; }}
          >
            <Table2 size={15} /> Browse Data
          </Link>
          {!isGit && (
            <button
              onClick={() => setFieldBuilder("new")}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer"
              style={{ background: "var(--primary)", color: "var(--text-inverse)" }}
            >
              <Plus size={15} /> Add Field
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      {collection.description && (
        <p className="text-sm" style={{ color: "var(--text-soft)" }}>
          {collection.description}
        </p>
      )}

      {/* Git instructions Banner */}
      {isGit && (
        <div className="flex gap-3 rounded-xl p-4 text-xs leading-relaxed animate-fade-in"
          style={{ background: "rgba(0,184,217,0.06)", border: "1px solid rgba(0,184,217,0.15)", color: "var(--text-soft)" }}>
          <GitBranch size={16} className="shrink-0" style={{ color: "#00B8D9" }} />
          <div className="flex flex-col gap-1">
            <strong style={{ color: "var(--text)" }}>Schema Synchronization</strong>
            <p>
              This collection schema is managed via git. To add, edit, or delete fields, update the <code>.genesis/config.json</code> file in your connected repository branch.
            </p>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Fields",   value: collection.fields.length },
          { label: "Required", value: collection.fields.filter((f) => f.required).length },
          { label: "Unique",   value: collection.fields.filter((f) => f.unique).length },
        ].map(({ label, value }) => (
          <div key={label}
            className="rounded-xl px-4 py-3 flex flex-col gap-0.5"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <p className="text-xl font-bold" style={{ color: "var(--text)" }}>{value}</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* System fields note */}
      <div className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--border)", background: "var(--bg-surface)" }}>
        {/* Table header */}
        <div
          className="grid grid-cols-[1rem_1fr_120px_80px_80px] gap-4 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider"
          style={{ background: "var(--bg-raised)", borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}
        >
          <span />
          <span>Field</span>
          <span>Type</span>
          <span>Flags</span>
          <span />
        </div>

        {/* System fields (always present) */}
        {[
          { name: "id",         label: "ID",         type: "uuid",     note: "Auto-generated" },
          { name: "created_at", label: "Created At",  type: "datetime", note: "Auto-set"       },
          { name: "updated_at", label: "Updated At",  type: "datetime", note: "Auto-updated"   },
        ].map(({ name, label, type, note }) => (
          <div key={name}
            className="flex items-center gap-4 px-5 py-3"
            style={{ borderBottom: "1px solid var(--border)", opacity: 0.5 }}>
            <div className="w-1 h-5 rounded-full" style={{ background: "var(--text-muted)" }} />
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{label}</p>
              <p className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>{name}</p>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full w-30"
              style={{ background: "var(--bg-overlay)", color: "var(--text-muted)" }}>
              {type}
            </span>
            <span className="text-[11px] w-20" style={{ color: "var(--text-muted)" }}>{note}</span>
            <div className="w-20">
              <Lock size={12} style={{ color: "var(--text-muted)" }} />
            </div>
          </div>
        ))}

        {/* User-defined fields */}
        {collection.fields.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No custom fields yet.
            </p>
            {!isGit && (
              <button
                onClick={() => setFieldBuilder("new")}
                className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg cursor-pointer"
                style={{ background: "var(--primary-dim)", color: "var(--primary)" }}
              >
                <Plus size={14} /> Add your first field
              </button>
            )}
          </div>
        ) : (
          collection.fields.map((field) => (
            <FieldRow
              key={field.id}
              field={field}
              collection={collection}
              onEdit={(f) => setFieldBuilder(f)}
            />
          ))
        )}
      </div>

      {/* Relationships */}
      {!isGit && (
        <RelationsSection
          collectionId={collection.id}
          collectionLabel={collection.label}
          relations={relations}
          allCollections={allCollections}
        />
      )}

      {/* Field builder modal */}
      {fieldBuilder !== null && (
        <FieldBuilder
          collectionId={collection.id}
          field={fieldBuilder === "new" ? null : fieldBuilder}
          onClose={() => setFieldBuilder(null)}
        />
      )}
    </div>
  );
}


"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Database, FileText, Users, Image, ShoppingCart,
  Tag, Mail, Calendar, Globe, BarChart2, Bookmark,
  MessageSquare, Package, Star, Heart, Zap, Music,
  Trash2, ArrowRight, Loader2, GitBranch, HardDrive,
} from "lucide-react";
import CreateCollectionModal from "@/components/collections/CreateCollectionModal";
import IntrospectModal from "./IntrospectModal";
import { deleteCollection } from "@/lib/actions/collections";
import type { Collection } from "@prisma/client";

/* ── Icon resolver ───────────────────────────────────────── */
const ICON_MAP: Record<string, React.ElementType> = {
  Database, FileText, Users, Image, ShoppingCart,
  Tag, Mail, Calendar, Globe, BarChart2, Bookmark,
  MessageSquare, Package, Star, Heart, Zap, Music,
};
function CollectionIcon({ name, size = 20 }: { name: string; size?: number }) {
  const Icon = ICON_MAP[name] ?? Database;
  return <Icon size={size} />;
}

/* ── Collection card ─────────────────────────────────────── */
function CollectionCard({
  collection,
  fieldCount,
}: {
  collection: Collection & { isGitBacked?: boolean };
  fieldCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming]  = useState(false);

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirming) { setConfirming(true); return; }
    startTransition(async () => {
      await deleteCollection(collection.id);
      router.refresh();
    });
  }

  const isGit = !!collection.isGitBacked;
  // DB-imported: has a tableName but it doesn't start with "genesis_col_" (external table)
  const isDbImported = !isGit && !!(collection as Collection & { tableName?: string | null }).tableName &&
    !(collection as Collection & { tableName?: string | null }).tableName?.startsWith("genesis_col_");

  return (
    <div
      className="group relative rounded-xl p-5 cursor-pointer transition-all duration-150 animate-fade-in"
      style={{
        background: "var(--bg-surface)",
        border:     "1px solid var(--border)",
      }}
      onClick={() => router.push(`/collections/${collection.id}`)}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-light)"; }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
        setConfirming(false);
      }}
    >
      {/* Git / DB Badge */}
      {isGit ? (
        <span className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase transition-all"
          style={{ background: "rgba(0,184,217,0.15)", color: "#00B8D9", border: "1px solid rgba(0,184,217,0.2)" }}>
          <GitBranch size={9} /> Git-Sync
        </span>
      ) : isDbImported ? (
        <span className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase"
          style={{ background: "rgba(129,199,132,0.15)", color: "#81c784", border: "1px solid rgba(129,199,132,0.25)" }}>
          <HardDrive size={9} /> DB Import
        </span>
      ) : null}

      {/* Icon */}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
        style={{ background: isGit ? "rgba(0,184,217,0.1)" : isDbImported ? "rgba(129,199,132,0.1)" : "var(--primary-dim)", color: isGit ? "#00B8D9" : isDbImported ? "#81c784" : "var(--primary)" }}>
        <CollectionIcon name={collection.icon} size={20} />
      </div>

      {/* Info */}
      <p className="text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>
        {collection.label}
      </p>
      <p className="text-[11px] font-mono mb-2" style={{ color: "var(--text-muted)" }}>
        {collection.name}
      </p>
      {collection.description && (
        <p className="text-xs mb-3 line-clamp-2" style={{ color: "var(--text-soft)" }}>
          {collection.description}
        </p>
      )}

      {/* Field count */}
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {fieldCount} {fieldCount === 1 ? "field" : "fields"}
      </p>

      {/* Actions — visible on hover */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {!isGit && (
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all cursor-pointer"
            style={{
              background: confirming ? "var(--danger)" : "var(--bg-overlay)",
              color:      confirming ? "#fff"          : "var(--text-muted)",
            }}
          >
            {isPending ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
            {confirming ? "Confirm" : "Delete"}
          </button>
        )}
        <div className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{
            background: isGit ? "rgba(0,184,217,0.2)" : "var(--primary-dim)",
            color:      isGit ? "#00B8D9"             : "var(--primary)"
          }}>
          <ArrowRight size={12} />
        </div>
      </div>
    </div>
  );
}

/* ── Collections client page ─────────────────────────────── */
type CollectionWithCount = Collection & { _count: { fields: number }; isGitBacked?: boolean };

export default function CollectionsClient({
  collections,
}: {
  collections: CollectionWithCount[];
}) {
  const [showCreate, setShowCreate]         = useState(false);
  const [showIntrospect, setShowIntrospect] = useState(false);

  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Collections</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-soft)" }}>
            {collections.length} collection{collections.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowIntrospect(true)}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all cursor-pointer"
            style={{ background: "var(--bg-raised)", color: "var(--text-soft)", border: "1px solid var(--border)" }}
          >
            <HardDrive size={14} /> Import from DB
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all cursor-pointer"
            style={{ background: "var(--primary)", color: "var(--text-inverse)" }}
          >
            <Plus size={15} /> New Collection
          </button>
        </div>
      </div>

      {/* Grid */}
      {collections.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-24 rounded-xl gap-4"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
            <Database size={26} />
          </div>
          <p className="text-base font-semibold" style={{ color: "var(--text)" }}>
            No collections yet
          </p>
          <p className="text-sm text-center max-w-sm" style={{ color: "var(--text-muted)" }}>
            Collections define the structure of your content. Create one to get started.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-2 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer"
            style={{ background: "var(--primary)", color: "var(--text-inverse)" }}
          >
            <Plus size={14} /> Create your first collection
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in">
          {collections.map((c) => (
            <CollectionCard
              key={c.id}
              collection={c}
              fieldCount={c._count.fields}
            />
          ))}
          {/* Add more card */}
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-xl p-5 flex flex-col items-center justify-center gap-2 transition-all duration-150 border-dashed cursor-pointer"
            style={{
              background:  "transparent",
              border:      "2px dashed var(--border)",
              color:       "var(--text-muted)",
              minHeight:   "140px",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--primary)";
              (e.currentTarget as HTMLButtonElement).style.color       = "var(--primary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
              (e.currentTarget as HTMLButtonElement).style.color       = "var(--text-muted)";
            }}
          >
            <Plus size={22} />
            <span className="text-sm font-medium">New Collection</span>
          </button>
        </div>
      )}

      {/* Modals */}
      {showCreate      && <CreateCollectionModal onClose={() => setShowCreate(false)} />}
      {showIntrospect  && <IntrospectModal       onClose={() => setShowIntrospect(false)} />}
    </div>
  );
}


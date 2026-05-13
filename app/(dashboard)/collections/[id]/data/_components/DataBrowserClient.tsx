"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, ArrowLeft, Trash2, Edit2, Loader2,
  Database, FileText, Users, Image, ShoppingCart,
  Tag, Mail, Calendar, Globe, BarChart2, Bookmark,
  MessageSquare, Package, Star, Heart, Zap, Music,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { deleteRecord, getRecords } from "@/lib/actions/collections";
import RecordFormModal from "./RecordFormModal";
import type { Collection, Field, Record as PrismaRecord } from "@prisma/client";

const ICON_MAP: Record<string, React.ElementType> = {
  Database, FileText, Users, Image, ShoppingCart,
  Tag, Mail, Calendar, Globe, BarChart2, Bookmark,
  MessageSquare, Package, Star, Heart, Zap, Music,
};

type CollectionWithFields = Collection & { fields: Field[] };

type FlatRecord = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  data: Record<string, unknown>;
  _raw: PrismaRecord;
};

function flattenRecord(r: PrismaRecord): FlatRecord {
  let data: Record<string, unknown> = {};
  try { data = JSON.parse(r.data); } catch { /* empty */ }
  return { id: r.id, createdAt: r.createdAt, updatedAt: r.updatedAt, data, _raw: r };
}

function formatCellValue(value: unknown, type: string): string {
  if (value === null || value === undefined || value === "") return "—";
  if (type === "boolean") return value ? "true" : "false";
  if (type === "password") return "••••••••";
  if (type === "relation") {
    if (Array.isArray(value)) return `${value.length} linked`;
    return `→ ${String(value).slice(0, 8)}`;
  }
  if ((type === "date" || type === "datetime") && typeof value === "string") {
    try {
      const d = new Date(value);
      return type === "date" ? d.toLocaleDateString() : d.toLocaleString();
    } catch { return String(value); }
  }
  if (type === "json") {
    try { return JSON.stringify(JSON.parse(String(value))).slice(0, 60); }
    catch { return String(value).slice(0, 60); }
  }
  return String(value).slice(0, 80);
}

/* ── Delete row button ───────────────────────────────────── */
function DeleteRowButton({ recordId, collectionId }: { recordId: string; collectionId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirming) { setConfirming(true); return; }
    startTransition(async () => {
      await deleteRecord(recordId, collectionId);
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      onMouseLeave={() => setConfirming(false)}
      className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all"
      style={{
        background: confirming ? "var(--danger)" : "var(--bg-raised)",
        color:      confirming ? "#fff"          : "var(--danger)",
      }}
    >
      {isPending ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
      {confirming ? "Sure?" : "Delete"}
    </button>
  );
}

/* ── Main client ─────────────────────────────────────────── */
export default function DataBrowserClient({
  collection,
  initialRecords,
  total,
  canCreate = true,
  canUpdate = true,
  canDelete = true,
}: {
  collection: CollectionWithFields;
  initialRecords: PrismaRecord[];
  total: number;
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
}) {
  const router = useRouter();
  const CollIcon = ICON_MAP[collection.icon] ?? Database;

  const visibleFields = collection.fields.filter((f) => !f.hidden);
  const [records, setRecords] = useState<FlatRecord[]>(initialRecords.map(flattenRecord));
  const [modalRecord, setModalRecord] = useState<FlatRecord | null | "new">(null);
  const [page, setPage] = useState(1);
  const [loadingPage, startPageTransition] = useTransition();
  const pageSize = 50;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function goToPage(p: number) {
    startPageTransition(async () => {
      const res = await getRecords(collection.id, p, pageSize);
      setRecords(res.records.map(flattenRecord));
      setPage(p);
    });
  }

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
        <Link
          href="/collections"
          className="transition-colors hover:text-(--text)"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--text)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-muted)"; }}
        >
          Collections
        </Link>
        <span>/</span>
        <Link
          href={`/collections/${collection.id}`}
          className="transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--text)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-muted)"; }}
        >
          {collection.label}
        </Link>
        <span>/</span>
        <span style={{ color: "var(--text)" }}>Data</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
            <CollIcon size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>{collection.label}</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{total} record{total !== 1 ? "s" : ""}</p>
          </div>
        </div>
        {canCreate && (
          <button
            onClick={() => setModalRecord("new")}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
            style={{ background: "var(--primary)", color: "var(--text-inverse)" }}
          >
            <Plus size={15} /> New Record
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--border)", background: "var(--bg-surface)" }}>

        {/* No fields state */}
        {visibleFields.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No fields defined yet.{" "}
              <Link href={`/collections/${collection.id}`} style={{ color: "var(--primary)" }}>
                Add fields first.
              </Link>
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse" style={{ minWidth: "600px" }}>
              <thead>
                <tr style={{ background: "var(--bg-raised)", borderBottom: "1px solid var(--border)" }}>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: "var(--text-muted)", width: "180px" }}>
                    ID
                  </th>
                  {visibleFields.map((f) => (
                    <th key={f.id}
                      className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap"
                      style={{ color: "var(--text-muted)" }}>
                      {f.label}
                    </th>
                  ))}
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: "var(--text-muted)" }}>
                    Created
                  </th>
                  <th className="w-24" />
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={visibleFields.length + 3}>
                      <div className="flex flex-col items-center gap-3 py-16">
                        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No records yet.</p>
                        {canCreate && (
                          <button
                            onClick={() => setModalRecord("new")}
                            className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg"
                            style={{ background: "var(--primary-dim)", color: "var(--primary)" }}
                          >
                            <Plus size={14} /> Add first record
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  records.map((rec) => (
                    <tr
                      key={rec.id}
                      className="group transition-colors cursor-pointer"
                      style={{ borderBottom: "1px solid var(--border)" }}
                      onClick={() => setModalRecord(rec)}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "var(--bg-overlay)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                    >
                      {/* ID */}
                      <td className="px-4 py-3 font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>
                        {rec.id.slice(0, 8)}…
                      </td>
                      {/* Field values */}
                      {visibleFields.map((f) => (
                        <td key={f.id} className="px-4 py-3 max-w-50" style={{ color: "var(--text)" }}>
                          <span className="block truncate">
                            {formatCellValue(rec.data[f.name], f.type)}
                          </span>
                        </td>
                      ))}
                      {/* Created at */}
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                        {new Date(rec.createdAt).toLocaleDateString()}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {canUpdate && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setModalRecord(rec); }}
                              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium"
                              style={{ background: "var(--bg-raised)", color: "var(--text-soft)" }}
                            >
                              <Edit2 size={11} /> Edit
                            </button>
                          )}
                          {canDelete && (
                            <DeleteRowButton recordId={rec.id} collectionId={collection.id} />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Page {page} of {totalPages} · {total} records
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1 || loadingPage}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              <ChevronLeft size={13} /> Prev
            </button>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages || loadingPage}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalRecord !== null && (
        <RecordFormModal
          collection={collection}
          record={modalRecord === "new" ? null : modalRecord._raw}
          onClose={() => { setModalRecord(null); router.refresh(); }}
        />
      )}
    </div>
  );
}

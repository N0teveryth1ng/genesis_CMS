"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  X, Database, Loader2, Download, ChevronDown, ChevronRight,
  CheckSquare, Square, AlertCircle, CheckCircle2,
} from "lucide-react";
import { getIntrospectionData, importTablesAsCollections } from "@/lib/actions/introspect";
import type { IntrospectedTable } from "@/lib/db-introspect";

const TYPE_COLORS: Record<string, string> = {
  text:     "#64b5f6",
  number:   "#81c784",
  boolean:  "#ffb74d",
  date:     "#f48fb1",
  datetime: "#ce93d8",
  json:     "#80cbc4",
  uuid:     "#90a4ae",
};

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
      style={{ background: `${TYPE_COLORS[type] ?? "#90a4ae"}22`, color: TYPE_COLORS[type] ?? "#90a4ae" }}>
      {type}
    </span>
  );
}

/* ── Single table row ─────────────────────────────────────── */
function TableRow({
  table,
  selected,
  onToggle,
}: {
  table: IntrospectedTable;
  selected: boolean;
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const userCols = table.columns.filter(
    (c) => !["id", "created_at", "updated_at"].includes(c.name),
  );

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${selected ? "var(--primary)" : "var(--border)"}`, background: selected ? "rgba(0,200,248,0.04)" : "var(--bg-surface)" }}>
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={onToggle} className="shrink-0 cursor-pointer" style={{ color: selected ? "var(--primary)" : "var(--text-muted)" }}>
          {selected ? <CheckSquare size={16} /> : <Square size={16} />}
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold font-mono" style={{ color: "var(--text)" }}>
            {table.tableName}
          </p>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            {userCols.length} importable column{userCols.length !== 1 ? "s" : ""}
          </p>
        </div>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 p-1 rounded"
          style={{ color: "var(--text-muted)", background: "var(--bg-raised)" }}
        >
          {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>
      </div>

      {/* Column list */}
      {expanded && (
        <div className="px-4 pb-3 flex flex-col gap-1" style={{ borderTop: "1px solid var(--border)" }}>
          <p className="text-[9px] font-bold uppercase tracking-wider pt-2 pb-1" style={{ color: "var(--text-muted)" }}>
            Columns
          </p>
          {table.columns.map((col) => (
            <div key={col.name} className="flex items-center gap-2">
              <span className="text-xs font-mono flex-1" style={{ color: ["id","created_at","updated_at"].includes(col.name) ? "var(--text-muted)" : "var(--text-soft)" }}>
                {col.name}
                {["id","created_at","updated_at"].includes(col.name) && (
                  <span className="ml-1 text-[9px]" style={{ color: "var(--text-muted)" }}>(system)</span>
                )}
              </span>
              <TypeBadge type={col.cmsType} />
              <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{col.pgType}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main modal ───────────────────────────────────────────── */
export default function IntrospectModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [tables, setTables]     = useState<IntrospectedTable[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [result, setResult]     = useState<{ imported: string[]; errors: Record<string, string> } | null>(null);

  useEffect(() => {
    getIntrospectionData().then((data) => {
      setTables(data);
      setLoading(false);
    });
  }, []);

  function toggleAll() {
    if (selected.size === tables.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(tables.map((t) => t.tableName)));
    }
  }

  function toggleOne(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  function handleImport() {
    if (selected.size === 0) return;
    startTransition(async () => {
      const res = await importTablesAsCollections([...selected]);
      setResult(res);
      if (res.imported.length > 0) {
        router.refresh();
      }
    });
  }

  const allSelected = tables.length > 0 && selected.size === tables.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>

      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
              <Database size={18} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--text)" }}>Import from Database</p>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                Existing tables detected in your Postgres schema
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "var(--text-muted)", background: "var(--bg-raised)" }}>
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <Loader2 size={28} className="animate-spin" style={{ color: "var(--primary)" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Scanning database schema…</p>
            </div>
          ) : result ? (
            <div className="flex flex-col gap-3 py-4">
              {result.imported.length > 0 && (
                <div className="flex items-start gap-3 p-4 rounded-xl"
                  style={{ background: "rgba(0,200,248,0.07)", border: "1px solid rgba(0,200,248,0.2)" }}>
                  <CheckCircle2 size={18} style={{ color: "var(--primary)", flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--primary)" }}>
                      {result.imported.length} table{result.imported.length !== 1 ? "s" : ""} imported
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {result.imported.join(", ")}
                    </p>
                  </div>
                </div>
              )}
              {Object.keys(result.errors).length > 0 && (
                <div className="flex items-start gap-3 p-4 rounded-xl"
                  style={{ background: "rgba(255,77,106,0.07)", border: "1px solid rgba(255,77,106,0.2)" }}>
                  <AlertCircle size={18} style={{ color: "var(--danger)", flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--danger)" }}>Some imports failed</p>
                    {Object.entries(result.errors).map(([t, msg]) => (
                      <p key={t} className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        <span className="font-mono">{t}</span>: {msg}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : tables.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Database size={32} style={{ color: "var(--text-muted)" }} />
              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>No tables to import</p>
              <p className="text-xs max-w-xs" style={{ color: "var(--text-muted)" }}>
                All tables in your database are either already imported or are Genesis system tables.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {/* Select all */}
              <div className="flex items-center justify-between mb-1">
                <button onClick={toggleAll} className="flex items-center gap-2 text-xs cursor-pointer"
                  style={{ color: "var(--text-soft)" }}>
                  {allSelected ? <CheckSquare size={14} style={{ color: "var(--primary)" }} /> : <Square size={14} />}
                  {allSelected ? "Deselect all" : "Select all"} ({tables.length})
                </button>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  {selected.size} selected
                </p>
              </div>

              {tables.map((t) => (
                <TableRow
                  key={t.tableName}
                  table={t}
                  selected={selected.has(t.tableName)}
                  onToggle={() => toggleOne(t.tableName)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!result && (
          <div className="shrink-0 px-6 py-4 flex items-center justify-end gap-3"
            style={{ borderTop: "1px solid var(--border)" }}>
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
              style={{ background: "var(--bg-raised)", color: "var(--text-soft)", border: "1px solid var(--border)" }}>
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={selected.size === 0 || isPending || loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-opacity disabled:opacity-40"
              style={{ background: "var(--primary)", color: "var(--text-inverse)" }}>
              {isPending
                ? <Loader2 size={14} className="animate-spin" />
                : <Download size={14} />}
              Import {selected.size > 0 ? `${selected.size} table${selected.size !== 1 ? "s" : ""}` : ""}
            </button>
          </div>
        )}

        {result && (
          <div className="shrink-0 px-6 py-4 flex justify-end" style={{ borderTop: "1px solid var(--border)" }}>
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer"
              style={{ background: "var(--primary)", color: "var(--text-inverse)" }}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

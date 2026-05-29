"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { deleteFormSubmission } from "@/lib/actions/forms";

interface Submission {
  id:        string;
  pageId:    string;
  pageSlug:  string;
  blockId:   string;
  data:      string;
  createdAt: Date;
}

function SubmissionCard({ sub }: { sub: Submission }) {
  const router = useRouter();
  const [expanded,  setExpanded]  = useState(false);
  const [confirm,   setConfirm]   = useState(false);
  const [isPending, startTransition] = useTransition();

  let fields: Record<string, string> = {};
  try { fields = JSON.parse(sub.data); } catch { /* empty */ }

  const preview = Object.values(fields).find(Boolean)?.slice(0, 60) ?? "—";

  function handleDelete() {
    if (!confirm) { setConfirm(true); return; }
    startTransition(async () => {
      await deleteFormSubmission(sub.id);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl overflow-hidden"
      style={{ border: "1px solid var(--border)", background: "var(--bg-surface)" }}>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
              /{sub.pageSlug}
            </span>
            <span className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{preview}</span>
          </div>
          <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            {new Date(sub.createdAt).toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setExpanded((v) => !v)}
            className="p-1.5 rounded-lg" style={{ background: "var(--bg-raised)", color: "var(--text-muted)" }}>
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          <button onClick={handleDelete}
            onMouseLeave={() => setConfirm(false)}
            disabled={isPending}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium"
            style={{
              background: confirm ? "var(--danger)" : "var(--bg-raised)",
              color:      confirm ? "#fff" : "var(--danger)",
            }}>
            {isPending ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
            {confirm ? "Sure?" : "Delete"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-3"
          style={{ borderTop: "1px solid var(--border)" }}>
          {Object.entries(fields).map(([key, val]) => (
            <div key={key} className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}>
                {key.replace(/_/g, " ")}
              </span>
              <span className="text-sm whitespace-pre-wrap" style={{ color: "var(--text)" }}>{val || "—"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FormsClient({
  submissions, pages,
}: {
  submissions: Submission[];
  pages:       { pageId: string; pageSlug: string }[];
}) {
  const [filter, setFilter] = useState<string>("");

  const filtered = filter
    ? submissions.filter((s) => s.pageId === filter)
    : submissions;

  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Form Submissions</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            {submissions.length} submission{submissions.length !== 1 ? "s" : ""} total
          </p>
        </div>

        {pages.length > 1 && (
          <select value={filter} onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: "var(--bg-raised)", border: "1px solid var(--border)", color: "var(--text)" }}>
            <option value="">All pages</option>
            {pages.map((p) => (
              <option key={p.pageId} value={p.pageId}>/{p.pageSlug}</option>
            ))}
          </select>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <FileText size={24} style={{ color: "var(--text-muted)", opacity: 0.4 }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No submissions yet.</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Add a Form block to a page to start collecting responses.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((sub) => <SubmissionCard key={sub.id} sub={sub} />)}
        </div>
      )}
    </div>
  );
}

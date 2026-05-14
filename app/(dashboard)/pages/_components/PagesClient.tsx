"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, LayoutTemplate, Trash2, Loader2, ExternalLink,
  FileEdit, Globe, FileX, X, AlertCircle,
} from "lucide-react";
import { createPage, deletePage } from "@/lib/actions/pages";
import type { Page } from "@prisma/client";

/* ── Create modal ────────────────────────────────────────── */
function CreatePageModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const slug = title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("slug", slug);
    startTransition(async () => {
      try {
        const page = await createPage(fd);
        router.push(`/pages/${page.id}`);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to create page");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl flex flex-col"
        style={{ background: "var(--bg-raised)", border: "1px solid var(--border-light)", boxShadow: "var(--shadow-lg)" }}
        onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>New Page</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "var(--text-muted)" }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          {error && (
            <div className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm"
              style={{ background: "rgba(255,77,106,0.1)", border: "1px solid rgba(255,77,106,0.2)", color: "var(--danger)" }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>
              Page Title <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <input
              name="title" required placeholder="e.g. Home, About Us, Landing"
              value={title} onChange={(e) => setTitle(e.target.value)}
              className="rounded-lg px-3 py-2.5 text-sm outline-none"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
              onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--primary)"; }}
              onBlur={(e)  => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>URL Slug</label>
            <div className="flex items-center rounded-lg overflow-hidden"
              style={{ border: "1px solid var(--border)", background: "var(--bg-surface)" }}>
              <span className="px-3 py-2.5 text-sm border-r shrink-0"
                style={{ background: "var(--bg-overlay)", color: "var(--text-muted)", borderColor: "var(--border)" }}>
                /site/
              </span>
              <span className="px-3 py-2.5 text-sm font-mono" style={{ color: slug ? "var(--text)" : "var(--text-muted)" }}>
                {slug || "auto-generated"}
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg py-2.5 text-sm font-medium"
              style={{ background: "var(--bg-overlay)", color: "var(--text-soft)", border: "1px solid var(--border)" }}>
              Cancel
            </button>
            <button type="submit" disabled={isPending || !title.trim()}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50"
              style={{ background: "var(--primary)", color: "var(--text-inverse)" }}>
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {isPending ? "Creating…" : "Create Page"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Page row ────────────────────────────────────────────── */
function PageRow({ page }: { page: Page }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isPublished = page.status === "published";

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirming) { setConfirming(true); return; }
    startTransition(async () => {
      await deletePage(page.id);
      router.refresh();
    });
  }

  return (
    <div className="group flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors"
      style={{ borderBottom: "1px solid var(--border)" }}
      onClick={() => router.push(`/pages/${page.id}`)}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--bg-overlay)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; setConfirming(false); }}>

      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
        <LayoutTemplate size={14} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{page.title}</p>
        <p className="text-[11px] font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>/site/{page.slug}</p>
      </div>

      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0"
        style={{
          background: isPublished ? "rgba(0,214,143,0.12)" : "var(--bg-overlay)",
          color:      isPublished ? "var(--success)"       : "var(--text-muted)",
        }}>
        {isPublished ? <Globe size={10} /> : <FileX size={10} />}
        {isPublished ? "Published" : "Draft"}
      </span>

      <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
        {new Date(page.updatedAt).toLocaleDateString()}
      </span>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); router.push(`/pages/${page.id}`); }}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium"
          style={{ background: "var(--bg-raised)", color: "var(--primary)" }}>
          <FileEdit size={11} /> Edit
        </button>
        {isPublished && (
          <a href={`/site/${page.slug}`} target="_blank" rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium"
            style={{ background: "var(--bg-raised)", color: "var(--text-soft)" }}>
            <ExternalLink size={11} />
          </a>
        )}
        <button
          onClick={handleDelete} disabled={isPending}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium"
          style={{
            background: confirming ? "var(--danger)" : "var(--bg-raised)",
            color:      confirming ? "#fff"          : "var(--danger)",
          }}>
          {isPending ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
          {confirming ? "Sure?" : ""}
        </button>
      </div>
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────── */
export default function PagesClient({ pages }: { pages: Page[] }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Pages</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            Build and publish pages without touching code.
          </p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
          style={{ background: "var(--primary)", color: "var(--text-inverse)" }}>
          <Plus size={15} /> New Page
        </button>
      </div>

      <div className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--border)", background: "var(--bg-surface)" }}>
        <div className="flex items-center gap-4 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider"
          style={{ background: "var(--bg-raised)", borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>
          <span className="w-8" />
          <span className="flex-1">Title / URL</span>
          <span>Status</span>
          <span>Updated</span>
          <span className="w-24" />
        </div>

        {pages.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
              <LayoutTemplate size={22} />
            </div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No pages yet.</p>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg"
              style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
              <Plus size={14} /> Create your first page
            </button>
          </div>
        ) : (
          pages.map((p) => <PageRow key={p.id} page={p} />)
        )}
      </div>

      {showModal && <CreatePageModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

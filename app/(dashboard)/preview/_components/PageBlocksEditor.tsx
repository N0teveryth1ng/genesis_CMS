"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { updatePageBlocks } from "@/lib/actions/pages";
import type { Page } from "@prisma/client";
import {
  Navigation, Type, LayoutGrid, MessageSquare, AlignLeft,
  Image as ImageIcon, ExternalLink, Mail, Footprints, Minus, Columns2,
  ChevronDown, ChevronRight, Check, Loader2, RefreshCw,
  LayoutTemplate, GripVertical,
} from "lucide-react";

interface Block { id: string; type: string; data: Record<string, string> }
interface FieldDef { key: string; label: string; type: "text" | "textarea" | "url" }

const BLOCK_META: Record<string, { label: string; icon: React.ElementType; color: string; fields: FieldDef[] }> = {
  navbar: {
    label: "Navbar", icon: Navigation, color: "#7B61FF",
    fields: [
      { key: "logo",   label: "Brand Name", type: "text" },
      { key: "cta",    label: "CTA Button", type: "text" },
      { key: "ctaUrl", label: "CTA Link",   type: "url"  },
    ],
  },
  hero: {
    label: "Hero Section", icon: Type, color: "#00C8F8",
    fields: [
      { key: "heading",    label: "Main Heading",  type: "text"     },
      { key: "subheading", label: "Subheading",    type: "textarea" },
      { key: "ctaLabel",   label: "CTA Button",    type: "text"     },
      { key: "ctaUrl",     label: "CTA Link",      type: "url"      },
    ],
  },
  features: {
    label: "Features", icon: LayoutGrid, color: "#00D68F",
    fields: [
      { key: "heading", label: "Section Heading",  type: "text" },
      { key: "f1title", label: "Feature 1 Title",  type: "text" },
      { key: "f1desc",  label: "Feature 1 Desc",   type: "text" },
      { key: "f2title", label: "Feature 2 Title",  type: "text" },
      { key: "f2desc",  label: "Feature 2 Desc",   type: "text" },
      { key: "f3title", label: "Feature 3 Title",  type: "text" },
      { key: "f3desc",  label: "Feature 3 Desc",   type: "text" },
    ],
  },
  testimonial: {
    label: "Testimonial", icon: MessageSquare, color: "#FF6B9D",
    fields: [
      { key: "quote",  label: "Quote",        type: "textarea" },
      { key: "author", label: "Author Name",  type: "text"     },
      { key: "role",   label: "Role / Title", type: "text"     },
    ],
  },
  text: {
    label: "Text Block", icon: AlignLeft, color: "#94A3B8",
    fields: [{ key: "content", label: "Content", type: "textarea" }],
  },
  image: {
    label: "Image", icon: ImageIcon, color: "#94A3B8",
    fields: [
      { key: "url",     label: "Image URL", type: "url"  },
      { key: "alt",     label: "Alt Text",  type: "text" },
      { key: "caption", label: "Caption",   type: "text" },
    ],
  },
  button: {
    label: "Button", icon: ExternalLink, color: "#7B61FF",
    fields: [
      { key: "label", label: "Button Text", type: "text" },
      { key: "url",   label: "URL",         type: "url"  },
    ],
  },
  contact: {
    label: "Contact", icon: Mail, color: "#00C8F8",
    fields: [
      { key: "heading", label: "Heading", type: "text"     },
      { key: "email",   label: "Email",   type: "text"     },
      { key: "phone",   label: "Phone",   type: "text"     },
      { key: "address", label: "Address", type: "textarea" },
    ],
  },
  footer: {
    label: "Footer", icon: Footprints, color: "#FFB800",
    fields: [
      { key: "logo", label: "Brand Name",     type: "text" },
      { key: "copy", label: "Copyright Text", type: "text" },
    ],
  },
  columns: {
    label: "Columns", icon: Columns2, color: "#94A3B8",
    fields: [
      { key: "left",  label: "Left Column",  type: "textarea" },
      { key: "right", label: "Right Column", type: "textarea" },
    ],
  },
  divider: { label: "Divider", icon: Minus, color: "#475569", fields: [] },
};

export default function PageBlocksEditor({
  pages,
  activePage,
  onPageChange,
  iframeRef,
  onSaved,
}: {
  pages:        Page[];
  activePage:   Page | null;
  onPageChange: (page: Page) => void;
  iframeRef:    React.RefObject<HTMLIFrameElement | null>;
  onSaved?:     () => void;
}) {
  const [blocks, setBlocks]   = useState<Block[]>([]);
  const [open, setOpen]       = useState<string>("");
  const [status, setStatus]   = useState<"idle" | "saving" | "saved">("idle");
  const [dragOver, setDragOver] = useState<number>(-1);
  const saveTimer             = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const statusTimer           = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dragIndex             = useRef<number>(-1);

  // Re-initialise whenever the selected page changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!activePage) { setBlocks([]); return; }
    try {
      const parsed = JSON.parse((activePage.blocks as string) ?? "[]");
      setBlocks(Array.isArray(parsed) ? parsed : []);
    } catch { setBlocks([]); }
    setOpen("");
    setStatus("idle");
    clearTimeout(saveTimer.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage?.id]);

  const persist = useCallback(async (nextBlocks: Block[]) => {
    if (!activePage) return;
    setStatus("saving");
    await updatePageBlocks(activePage.id, nextBlocks);
    setStatus("saved");
    onSaved?.();
    clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatus("idle"), 2500);
  }, [activePage, onSaved]);

  function handleDrop(dropIdx: number) {
    const from = dragIndex.current;
    if (from === -1 || from === dropIdx) return;
    const next = [...blocks];
    const [moved] = next.splice(from, 1);
    next.splice(dropIdx, 0, moved);
    setBlocks(next);
    dragIndex.current = -1;
    setDragOver(-1);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(next), 800);
  }

  function handleChange(blockId: string, key: string, value: string) {
    const next = blocks.map((b) =>
      b.id === blockId ? { ...b, data: { ...b.data, [key]: value } } : b,
    );
    setBlocks(next);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(next), 1400);
  }

  if (pages.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 px-6 text-center">
        <LayoutTemplate size={20} style={{ color: "var(--text-muted)" }} />
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>No published pages yet.</p>
        <Link href="/pages" className="text-xs font-semibold px-3 py-1.5 rounded-lg"
          style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
          Create a Page →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">

      {/* Header: page selector */}
      <div className="shrink-0 px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
          style={{ color: "var(--text-muted)" }}>Page</p>
        <select
          value={activePage?.id ?? ""}
          onChange={(e) => {
            const p = pages.find((pg) => pg.id === e.target.value);
            if (p) onPageChange(p);
          }}
          className="w-full rounded-lg px-2.5 py-2 text-xs outline-none"
          style={{
            background: "var(--bg-raised)",
            border:     "1px solid var(--border)",
            color:      "var(--text)",
          }}>
          {pages.map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
      </div>

      {/* Status + save indicator */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-raised)" }}>
        <p className="text-xs font-bold" style={{ color: "var(--text)" }}>Edit Blocks</p>
        <span className="flex items-center gap-1 text-[10px]"
          style={{ color: status === "saved" ? "var(--success)" : "var(--text-muted)" }}>
          {status === "saving" && <Loader2 size={10} className="animate-spin" />}
          {status === "saved"  && <Check size={10} />}
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved!" : "Auto-saves on change"}
        </span>
      </div>

      {/* Block list */}
      <div className="flex-1 overflow-y-auto">
        {blocks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 px-4 text-center">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              This page has no blocks yet.
            </p>
            <Link href={activePage ? `/pages/${activePage.id}` : "/pages"}
              className="text-xs font-semibold" style={{ color: "var(--primary)" }}>
              Open block editor →
            </Link>
          </div>
        ) : (
          // eslint-disable-next-line react-hooks/refs
          blocks.map((block, idx) => {
            const meta   = BLOCK_META[block.type] ?? { label: block.type, icon: Type, color: "#94A3B8", fields: [] };
            const Icon   = meta.icon;
            const isOpen = open === block.id;

            return (
              <div
                key={block.id}
                draggable
                onDragStart={() => { dragIndex.current = idx; }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(idx); }}
                onDragEnd={() => { dragIndex.current = -1; setDragOver(-1); }}
                onDrop={(e) => { e.preventDefault(); handleDrop(idx); }}
                style={{
                  borderBottom: "1px solid var(--border)",
                  opacity:      dragIndex.current === idx ? 0.4 : 1,
                  outline:      dragOver === idx ? "2px solid var(--primary)" : "none",
                  outlineOffset: "-2px",
                }}
              >
                <button
                  onClick={() => setOpen(isOpen ? "" : block.id)}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-left"
                  style={{ background: isOpen ? "var(--primary-dim)" : "transparent" }}>
                  <GripVertical size={11} style={{ color: "var(--text-muted)", cursor: "grab", flexShrink: 0 }} />
                  <div className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                    style={{ background: meta.color + "20" }}>
                    <Icon size={11} style={{ color: meta.color }} />
                  </div>
                  <span className="flex-1 text-xs font-medium truncate"
                    style={{ color: isOpen ? "var(--primary)" : "var(--text)" }}>
                    {meta.label}
                    {block.data.heading || block.data.logo || block.data.label
                      ? <span className="ml-1.5 font-normal" style={{ color: "var(--text-muted)" }}>
                          — {(block.data.heading || block.data.logo || block.data.label)?.slice(0, 24)}
                        </span>
                      : null}
                  </span>
                  {isOpen
                    ? <ChevronDown size={12} style={{ color: "var(--primary)" }} />
                    : <ChevronRight size={12} style={{ color: "var(--text-muted)" }} />}
                </button>

                {isOpen && (
                  <div className="flex flex-col gap-3 px-4 pb-4 pt-2"
                    style={{ background: "var(--bg-raised)" }}>
                    {meta.fields.length === 0 ? (
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        No editable text content for this block.
                      </p>
                    ) : meta.fields.map((field) => (
                      <div key={field.key}>
                        <label className="block mb-1 text-[10px] font-semibold uppercase tracking-wide"
                          style={{ color: "var(--text-muted)" }}>
                          {field.label}
                        </label>
                        {field.type === "textarea" ? (
                          <textarea
                            rows={3}
                            value={block.data[field.key] ?? ""}
                            onChange={(e) => handleChange(block.id, field.key, e.target.value)}
                            className="w-full rounded-lg px-3 py-2 text-xs resize-none outline-none"
                            style={{
                              background: "var(--bg-surface)",
                              border:     "1px solid var(--border)",
                              color:      "var(--text)",
                              lineHeight: "1.5",
                            }}
                          />
                        ) : (
                          <input
                            type="text"
                            value={block.data[field.key] ?? ""}
                            onChange={(e) => handleChange(block.id, field.key, e.target.value)}
                            className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                            style={{
                              background: "var(--bg-surface)",
                              border:     "1px solid var(--border)",
                              color:      "var(--text)",
                            }}
                          />
                        )}
                      </div>
                    ))}
                    <a href={activePage ? `/pages/${activePage.id}` : "/pages"}
                      className="text-[10px] font-medium mt-1"
                      style={{ color: "var(--text-muted)" }}>
                      Advanced editing → Block editor
                    </a>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 shrink-0 flex items-center justify-between"
        style={{ borderTop: "1px solid var(--border)" }}>
        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          Changes auto-save • Preview reloads after save
        </p>
        <button
          onClick={() => { if (iframeRef.current) iframeRef.current.src = iframeRef.current.src; }}
          className="p-1.5 rounded-lg"
          title="Reload preview"
          style={{ background: "var(--bg-raised)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
          <RefreshCw size={11} />
        </button>
      </div>
    </div>
  );
}

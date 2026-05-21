"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Save, Globe, FileX, Plus, Trash2, GripVertical,
  Loader2, ChevronDown, ChevronUp, Type, AlignLeft, Image,
  Minus, Columns2, ExternalLink, Check, Navigation, LayoutGrid,
  MessageSquare, Footprints, Mail,
} from "lucide-react";
import { updatePageBlocks, updatePageStatus, updatePageMeta } from "@/lib/actions/pages";
import type { Page } from "@prisma/client";

/* ── Block types ─────────────────────────────────────────── */
export type BlockType = "hero" | "text" | "image" | "divider" | "columns" | "button" | "navbar" | "features" | "testimonial" | "footer" | "contact";

export interface Block {
  id:   string;
  type: BlockType;
  data: Record<string, string>;
}

const BLOCK_DEFS: { type: BlockType; label: string; icon: React.ElementType; defaults: Record<string, string> }[] = [
  { type: "navbar",      label: "Navbar",      icon: Navigation,  defaults: { logo: "My Brand", links: "Home,About,Contact", cta: "Get Started", ctaUrl: "#", bg: "#ffffff" } },
  { type: "hero",        label: "Hero",        icon: Type,        defaults: { heading: "Welcome to our site", subheading: "A short description of what you do.", ctaLabel: "Get Started", ctaUrl: "#", align: "center", bg: "#0f172a", color: "#ffffff" } },
  { type: "features",    label: "Features",    icon: LayoutGrid,  defaults: { heading: "Why choose us", f1title: "Fast", f1desc: "Built for speed", f2title: "Reliable", f2desc: "Always available", f3title: "Secure", f3desc: "Your data is safe" } },
  { type: "testimonial", label: "Testimonial", icon: MessageSquare, defaults: { quote: "This product changed how we work.", author: "Jane Doe", role: "CEO, Acme Inc", bg: "#f8fafc" } },
  { type: "text",        label: "Text Block",  icon: AlignLeft,   defaults: { content: "Add your text here..." } },
  { type: "image",       label: "Image",       icon: Image,       defaults: { url: "", alt: "", caption: "" } },
  { type: "button",      label: "Button",      icon: ExternalLink, defaults: { label: "Click here", url: "#", align: "center", variant: "primary" } },
  { type: "contact",     label: "Contact",     icon: Mail,        defaults: { heading: "Get in touch", email: "hello@example.com", phone: "", address: "", bg: "#f8fafc" } },
  { type: "columns",     label: "Columns",     icon: Columns2,    defaults: { left: "Left column content", right: "Right column content" } },
  { type: "footer",      label: "Footer",      icon: Footprints,  defaults: { logo: "My Brand", links: "Home,About,Contact,Privacy", copy: `© ${new Date().getFullYear()} My Brand. All rights reserved.`, bg: "#0f172a", color: "#ffffff" } },
  { type: "divider",     label: "Divider",     icon: Minus,       defaults: {} },
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/* ── Block editor panels ─────────────────────────────────── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="rounded-lg px-3 py-2 text-sm outline-none w-full"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
      onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--primary)"; }}
      onBlur={(e)  => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 4 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className="rounded-lg px-3 py-2 text-sm outline-none w-full resize-none"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
      onFocus={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = "var(--primary)"; }}
      onBlur={(e)  => { (e.target as HTMLTextAreaElement).style.borderColor = "var(--border)"; }}
    />
  );
}

function BlockFields({ block, onChange }: { block: Block; onChange: (data: Record<string, string>) => void }) {
  const d = block.data;
  const set = (key: string, val: string) => onChange({ ...d, [key]: val });

  switch (block.type) {
    case "navbar":
      return (
        <>
          <Field label="Brand / Logo Text"><Input value={d.logo ?? ""} onChange={(v) => set("logo", v)} placeholder="My Brand" /></Field>
          <Field label="Nav Links (comma separated)"><Input value={d.links ?? ""} onChange={(v) => set("links", v)} placeholder="Home,About,Services,Contact" /></Field>
          <Field label="CTA Button Label"><Input value={d.cta ?? ""} onChange={(v) => set("cta", v)} placeholder="Get Started" /></Field>
          <Field label="CTA Button URL"><Input value={d.ctaUrl ?? ""} onChange={(v) => set("ctaUrl", v)} placeholder="#" /></Field>
          <Field label="Background Color"><Input value={d.bg ?? "#ffffff"} onChange={(v) => set("bg", v)} placeholder="#ffffff" /></Field>
        </>
      );
    case "hero":
      return (
        <>
          <Field label="Heading"><Input value={d.heading ?? ""} onChange={(v) => set("heading", v)} placeholder="Main heading" /></Field>
          <Field label="Subheading"><Textarea value={d.subheading ?? ""} onChange={(v) => set("subheading", v)} placeholder="Subtitle text" rows={2} /></Field>
          <Field label="CTA Button Label"><Input value={d.ctaLabel ?? ""} onChange={(v) => set("ctaLabel", v)} placeholder="Get Started" /></Field>
          <Field label="CTA Button URL"><Input value={d.ctaUrl ?? ""} onChange={(v) => set("ctaUrl", v)} placeholder="#" /></Field>
          <Field label="Alignment">
            <select value={d.align ?? "center"} onChange={(e) => set("align", e.target.value)}
              className="rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </Field>
          <Field label="Background Color"><Input value={d.bg ?? "#0f172a"} onChange={(v) => set("bg", v)} placeholder="#0f172a" /></Field>
          <Field label="Text Color"><Input value={d.color ?? "#ffffff"} onChange={(v) => set("color", v)} placeholder="#ffffff" /></Field>
        </>
      );
    case "features":
      return (
        <>
          <Field label="Section Heading"><Input value={d.heading ?? ""} onChange={(v) => set("heading", v)} placeholder="Why choose us" /></Field>
          <Field label="Feature 1 Title"><Input value={d.f1title ?? ""} onChange={(v) => set("f1title", v)} /></Field>
          <Field label="Feature 1 Description"><Input value={d.f1desc ?? ""} onChange={(v) => set("f1desc", v)} /></Field>
          <Field label="Feature 2 Title"><Input value={d.f2title ?? ""} onChange={(v) => set("f2title", v)} /></Field>
          <Field label="Feature 2 Description"><Input value={d.f2desc ?? ""} onChange={(v) => set("f2desc", v)} /></Field>
          <Field label="Feature 3 Title"><Input value={d.f3title ?? ""} onChange={(v) => set("f3title", v)} /></Field>
          <Field label="Feature 3 Description"><Input value={d.f3desc ?? ""} onChange={(v) => set("f3desc", v)} /></Field>
        </>
      );
    case "testimonial":
      return (
        <>
          <Field label="Quote"><Textarea value={d.quote ?? ""} onChange={(v) => set("quote", v)} rows={3} placeholder="What did they say?" /></Field>
          <Field label="Author Name"><Input value={d.author ?? ""} onChange={(v) => set("author", v)} placeholder="Jane Doe" /></Field>
          <Field label="Author Role"><Input value={d.role ?? ""} onChange={(v) => set("role", v)} placeholder="CEO, Acme Inc" /></Field>
          <Field label="Background Color"><Input value={d.bg ?? "#f8fafc"} onChange={(v) => set("bg", v)} /></Field>
        </>
      );
    case "contact":
      return (
        <>
          <Field label="Section Heading"><Input value={d.heading ?? ""} onChange={(v) => set("heading", v)} placeholder="Get in touch" /></Field>
          <Field label="Email"><Input value={d.email ?? ""} onChange={(v) => set("email", v)} placeholder="hello@example.com" /></Field>
          <Field label="Phone"><Input value={d.phone ?? ""} onChange={(v) => set("phone", v)} placeholder="+1 234 567 8900" /></Field>
          <Field label="Address"><Textarea value={d.address ?? ""} onChange={(v) => set("address", v)} rows={2} placeholder="123 Main St, City" /></Field>
          <Field label="Background Color"><Input value={d.bg ?? "#f8fafc"} onChange={(v) => set("bg", v)} /></Field>
        </>
      );
    case "footer":
      return (
        <>
          <Field label="Brand / Logo Text"><Input value={d.logo ?? ""} onChange={(v) => set("logo", v)} placeholder="My Brand" /></Field>
          <Field label="Footer Links (comma separated)"><Input value={d.links ?? ""} onChange={(v) => set("links", v)} placeholder="Home,About,Privacy,Terms" /></Field>
          <Field label="Copyright Text"><Input value={d.copy ?? ""} onChange={(v) => set("copy", v)} placeholder={`© ${new Date().getFullYear()} My Brand`} /></Field>
          <Field label="Background Color"><Input value={d.bg ?? "#0f172a"} onChange={(v) => set("bg", v)} /></Field>
          <Field label="Text Color"><Input value={d.color ?? "#ffffff"} onChange={(v) => set("color", v)} /></Field>
        </>
      );
    case "text":
      return (
        <Field label="Content"><Textarea value={d.content ?? ""} onChange={(v) => set("content", v)} rows={6} /></Field>
      );
    case "image":
      return (
        <>
          <Field label="Image URL"><Input value={d.url ?? ""} onChange={(v) => set("url", v)} placeholder="https://..." /></Field>
          <Field label="Alt Text"><Input value={d.alt ?? ""} onChange={(v) => set("alt", v)} /></Field>
          <Field label="Caption"><Input value={d.caption ?? ""} onChange={(v) => set("caption", v)} /></Field>
        </>
      );
    case "button":
      return (
        <>
          <Field label="Label"><Input value={d.label ?? ""} onChange={(v) => set("label", v)} placeholder="Click here" /></Field>
          <Field label="URL"><Input value={d.url ?? ""} onChange={(v) => set("url", v)} placeholder="https://..." /></Field>
          <Field label="Alignment">
            <select value={d.align ?? "center"} onChange={(e) => set("align", e.target.value)}
              className="rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </Field>
          <Field label="Style">
            <select value={d.variant ?? "primary"} onChange={(e) => set("variant", e.target.value)}
              className="rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
              <option value="primary">Primary</option>
              <option value="outline">Outline</option>
              <option value="ghost">Ghost</option>
            </select>
          </Field>
        </>
      );
    case "columns":
      return (
        <>
          <Field label="Left Column"><Textarea value={d.left ?? ""} onChange={(v) => set("left", v)} rows={4} /></Field>
          <Field label="Right Column"><Textarea value={d.right ?? ""} onChange={(v) => set("right", v)} rows={4} /></Field>
        </>
      );
    case "divider":
      return <p className="text-xs" style={{ color: "var(--text-muted)" }}>Horizontal divider — no options.</p>;
  }
}

/* ── Single block card ───────────────────────────────────── */
function BlockCard({
  block, index, total,
  onMove, onDelete, onChange,
}: {
  block: Block; index: number; total: number;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
  onChange: (data: Record<string, string>) => void;
}) {
  const [open, setOpen] = useState(true);
  const def = BLOCK_DEFS.find((d) => d.type === block.type)!;
  const Icon = def.icon;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg-surface)" }}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        style={{ background: "var(--bg-raised)", borderBottom: open ? "1px solid var(--border)" : "none" }}
        onClick={() => setOpen((o) => !o)}>
        <GripVertical size={14} style={{ color: "var(--text-muted)" }} />
        <div className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
          <Icon size={12} />
        </div>
        <span className="text-sm font-medium flex-1" style={{ color: "var(--text)" }}>{def.label}</span>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button disabled={index === 0} onClick={() => onMove(-1)}
            className="p-1 rounded disabled:opacity-30" style={{ color: "var(--text-muted)" }}>
            <ChevronUp size={13} />
          </button>
          <button disabled={index === total - 1} onClick={() => onMove(1)}
            className="p-1 rounded disabled:opacity-30" style={{ color: "var(--text-muted)" }}>
            <ChevronDown size={13} />
          </button>
          <button onClick={onDelete} className="p-1 rounded" style={{ color: "var(--danger)" }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {open && (
        <div className="flex flex-col gap-4 p-4">
          <BlockFields block={block} onChange={onChange} />
        </div>
      )}
    </div>
  );
}

/* ── Add block picker ────────────────────────────────────── */
function AddBlockPicker({ onAdd }: { onAdd: (type: BlockType) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all"
        style={{ border: "2px dashed var(--border)", color: "var(--text-muted)", background: "transparent" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--primary)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--primary)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}>
        <Plus size={15} /> Add Block
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 z-20 mt-2 rounded-xl overflow-hidden shadow-2xl"
            style={{ background: "var(--bg-raised)", border: "1px solid var(--border-light)" }}>
            {BLOCK_DEFS.map(({ type, label, icon: Icon }) => (
              <button key={type}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors"
                style={{ color: "var(--text-soft)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-overlay)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-soft)"; }}
                onClick={() => { onAdd(type); setOpen(false); }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
                  <Icon size={13} />
                </div>
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Main editor ─────────────────────────────────────────── */
export default function PageEditor({ page }: { page: Page }) {
  const router = useRouter();
  const [blocks, setBlocks] = useState<Block[]>(() => {
    try { return JSON.parse(page.blocks) as Block[]; } catch { return []; }
  });
  const [status, setStatus]   = useState(page.status as "draft" | "published");
  const [saved, setSaved]     = useState(false);
  const [isPending, startTransition] = useTransition();

  function addBlock(type: BlockType) {
    const def = BLOCK_DEFS.find((d) => d.type === type)!;
    setBlocks((prev) => [...prev, { id: uid(), type, data: { ...def.defaults } }]);
  }

  function updateBlock(id: string, data: Record<string, string>) {
    setBlocks((prev) => prev.map((b) => b.id === id ? { ...b, data } : b));
  }

  function deleteBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  function moveBlock(id: string, dir: -1 | 1) {
    setBlocks((prev) => {
      const i = prev.findIndex((b) => b.id === id);
      const next = [...prev];
      const target = i + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[i], next[target]] = [next[target], next[i]];
      return next;
    });
  }

  function save(newStatus?: "draft" | "published") {
    const finalStatus = newStatus ?? status;
    startTransition(async () => {
      await updatePageBlocks(page.id, blocks);
      await updatePageStatus(page.id, finalStatus);
      setStatus(finalStatus);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-surface)" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/pages")}
            className="flex items-center gap-1.5 text-sm"
            style={{ color: "var(--text-muted)" }}>
            <ArrowLeft size={15} /> Pages
          </button>
          <span style={{ color: "var(--border)" }}>·</span>
          <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{page.title}</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              background: status === "published" ? "rgba(0,214,143,0.12)" : "var(--bg-overlay)",
              color:      status === "published" ? "var(--success)"       : "var(--text-muted)",
            }}>
            {status === "published" ? "Published" : "Draft"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {status === "published" && (
            <a href={`/site/${page.slug}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: "var(--bg-overlay)", color: "var(--text-soft)", border: "1px solid var(--border)" }}>
              <ExternalLink size={12} /> Preview
            </a>
          )}
          <button onClick={() => save(status === "published" ? "draft" : "published")} disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "var(--bg-overlay)", color: "var(--text-soft)", border: "1px solid var(--border)" }}>
            {status === "published" ? <FileX size={12} /> : <Globe size={12} />}
            {status === "published" ? "Unpublish" : "Publish"}
          </button>
          <button onClick={() => save()} disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-60"
            style={{ background: "var(--primary)", color: "var(--text-inverse)" }}>
            {isPending ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : <Save size={13} />}
            {isPending ? "Saving…" : saved ? "Saved!" : "Save"}
          </button>
        </div>
      </div>

      {/* Editor body */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-3">
          {blocks.length === 0 && (
            <div className="text-center py-12 rounded-xl"
              style={{ border: "2px dashed var(--border)", color: "var(--text-muted)" }}>
              <Plus size={24} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No blocks yet. Add your first block below.</p>
            </div>
          )}

          {blocks.map((block, i) => (
            <BlockCard
              key={block.id}
              block={block}
              index={i}
              total={blocks.length}
              onMove={(dir) => moveBlock(block.id, dir)}
              onDelete={() => deleteBlock(block.id)}
              onChange={(data) => updateBlock(block.id, data)}
            />
          ))}

          <AddBlockPicker onAdd={addBlock} />
        </div>
      </div>
    </div>
  );
}

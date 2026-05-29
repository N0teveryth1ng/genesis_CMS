"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Save, Globe, FileX, Plus, Trash2, GripVertical,
  Loader2, ChevronDown, ChevronUp, Type, AlignLeft, Image,
  Minus, Columns2, ExternalLink, Check, Navigation, LayoutGrid,
  MessageSquare, Footprints, Mail, Sliders, FormInput,
  Share2, LayoutTemplate, X, Copy,
} from "lucide-react";
import { updatePageBlocks, updatePageStatus, updatePageMeta } from "@/lib/actions/pages";
import { TEMPLATES } from "@/lib/templates";
import type { Page } from "@prisma/client";

/* ── Block types ─────────────────────────────────────────── */
export type BlockType =
  | "hero" | "text" | "image" | "divider" | "columns" | "button"
  | "navbar" | "features" | "testimonial" | "footer" | "contact" | "form";

export interface BlockStyle {
  bg?:           string;
  color?:        string;
  paddingY?:     "none" | "sm" | "md" | "lg" | "xl";
  textAlign?:    "left" | "center" | "right";
  fontSize?:     "sm" | "base" | "lg" | "xl";
  fontWeight?:   "normal" | "medium" | "bold";
  borderRadius?: "none" | "sm" | "md" | "lg";
}

export interface Block {
  id:     string;
  type:   BlockType;
  data:   Record<string, string>;
  style?: BlockStyle;
}

/* ── Block definitions ───────────────────────────────────── */
const BLOCK_DEFS: { type: BlockType; label: string; icon: React.ElementType; defaults: Record<string, string> }[] = [
  { type: "navbar",      label: "Navbar",      icon: Navigation,  defaults: { logo: "My Brand", links: "Home,About,Contact", cta: "Get Started", ctaUrl: "#" } },
  { type: "hero",        label: "Hero",        icon: Type,        defaults: { heading: "Welcome to our site", subheading: "A short description of what you do.", ctaLabel: "Get Started", ctaUrl: "#", align: "center" } },
  { type: "features",    label: "Features",    icon: LayoutGrid,  defaults: { heading: "Why choose us", f1title: "Fast", f1desc: "Built for speed", f2title: "Reliable", f2desc: "Always available", f3title: "Secure", f3desc: "Your data is safe" } },
  { type: "testimonial", label: "Testimonial", icon: MessageSquare, defaults: { quote: "This product changed how we work.", author: "Jane Doe", role: "CEO, Acme Inc" } },
  { type: "text",        label: "Text Block",  icon: AlignLeft,   defaults: { content: "Add your text here..." } },
  { type: "image",       label: "Image",       icon: Image,       defaults: { url: "", alt: "", caption: "" } },
  { type: "button",      label: "Button",      icon: ExternalLink, defaults: { label: "Click here", url: "#", align: "center", variant: "primary" } },
  { type: "contact",     label: "Contact",     icon: Mail,        defaults: { heading: "Get in touch", email: "hello@example.com", phone: "", address: "" } },
  { type: "form",        label: "Form",        icon: FormInput,   defaults: { heading: "Contact Us", submitLabel: "Send Message", successMsg: "Thanks! We'll be in touch.", fields: JSON.stringify([{ id: "f1", label: "Name", type: "text", required: true }, { id: "f2", label: "Email", type: "email", required: true }, { id: "f3", label: "Message", type: "textarea", required: true }]) } },
  { type: "columns",     label: "Columns",     icon: Columns2,    defaults: { left: "Left column content", right: "Right column content" } },
  { type: "footer",      label: "Footer",      icon: Footprints,  defaults: { logo: "My Brand", links: "Home,About,Contact,Privacy", copy: `© ${new Date().getFullYear()} My Brand. All rights reserved.` } },
  { type: "divider",     label: "Divider",     icon: Minus,       defaults: {} },
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/* ── Shared field components ─────────────────────────────── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
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

/* ── Style panel ─────────────────────────────────────────── */
function ChipGroup({ options, value, onChange }: {
  options: { val: string; label: string }[];
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1 flex-wrap">
      {options.map((o) => (
        <button key={o.val} onClick={() => onChange(o.val)}
          className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
          style={{
            background: value === o.val ? "var(--primary)" : "var(--bg-surface)",
            color:      value === o.val ? "var(--text-inverse)" : "var(--text-soft)",
            border:     "1px solid var(--border)",
          }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value || "#ffffff"} onChange={(e) => onChange(e.target.value)}
          className="shrink-0 cursor-pointer rounded-md"
          style={{ width: 32, height: 32, padding: 2, border: "1px solid var(--border)", background: "var(--bg-surface)" }} />
        <Input value={value} onChange={onChange} placeholder="transparent" />
      </div>
    </div>
  );
}

const PADDING_OPTS = [{ val: "none", label: "None" }, { val: "sm", label: "S" }, { val: "md", label: "M" }, { val: "lg", label: "L" }, { val: "xl", label: "XL" }];
const RADIUS_OPTS  = [{ val: "none", label: "None" }, { val: "sm", label: "S" }, { val: "md", label: "M" }, { val: "lg", label: "L" }];
const ALIGN_OPTS   = [{ val: "left", label: "Left" }, { val: "center", label: "Center" }, { val: "right", label: "Right" }];
const SIZE_OPTS    = [{ val: "sm", label: "S" }, { val: "base", label: "M" }, { val: "lg", label: "L" }, { val: "xl", label: "XL" }];
const WEIGHT_OPTS  = [{ val: "normal", label: "Normal" }, { val: "medium", label: "Medium" }, { val: "bold", label: "Bold" }];

function StylePanel({ style, onChange }: { style: BlockStyle; onChange: (s: BlockStyle) => void }) {
  const set = (key: keyof BlockStyle, val: string) => onChange({ ...style, [key]: val });
  const hasAny = Object.values(style).some((v) => v !== undefined && v !== "");
  return (
    <div className="flex flex-col gap-4">
      <ColorInput label="Background" value={style.bg    ?? ""} onChange={(v) => set("bg",    v)} />
      <ColorInput label="Text Color" value={style.color ?? ""} onChange={(v) => set("color", v)} />
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>Padding</label>
        <ChipGroup options={PADDING_OPTS} value={style.paddingY}     onChange={(v) => set("paddingY",     v)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>Rounding</label>
        <ChipGroup options={RADIUS_OPTS}  value={style.borderRadius} onChange={(v) => set("borderRadius", v)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>Text Align</label>
        <ChipGroup options={ALIGN_OPTS}   value={style.textAlign}    onChange={(v) => set("textAlign",    v)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>Font Size</label>
        <ChipGroup options={SIZE_OPTS}    value={style.fontSize}     onChange={(v) => set("fontSize",     v)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>Font Weight</label>
        <ChipGroup options={WEIGHT_OPTS}  value={style.fontWeight}   onChange={(v) => set("fontWeight",   v)} />
      </div>
      {hasAny && (
        <button onClick={() => onChange({})}
          className="text-xs px-3 py-1.5 rounded-lg w-full"
          style={{ background: "var(--bg-raised)", color: "var(--danger)", border: "1px solid var(--border)" }}>
          Reset styles
        </button>
      )}
    </div>
  );
}

/* ── Form field builder ──────────────────────────────────── */
interface FormFieldDef {
  id:       string;
  label:    string;
  type:     string;
  required: boolean;
}

function FormFieldBuilder({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [fields, setFields] = useState<FormFieldDef[]>(() => {
    try { return JSON.parse(value || "[]"); } catch { return []; }
  });

  function update(next: FormFieldDef[]) {
    setFields(next);
    onChange(JSON.stringify(next));
  }

  function addField() {
    update([...fields, { id: uid(), label: "New Field", type: "text", required: false }]);
  }

  return (
    <div className="flex flex-col gap-2">
      {fields.map((f, i) => (
        <div key={f.id} className="flex items-center gap-2 p-2 rounded-lg"
          style={{ background: "var(--bg-raised)", border: "1px solid var(--border)" }}>
          <div className="flex-1 min-w-0">
            <input
              value={f.label}
              onChange={(e) => update(fields.map((ff, j) => j === i ? { ...ff, label: e.target.value } : ff))}
              className="w-full text-xs rounded px-2 py-1 outline-none"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
              placeholder="Field label"
            />
          </div>
          <select
            value={f.type}
            onChange={(e) => update(fields.map((ff, j) => j === i ? { ...ff, type: e.target.value } : ff))}
            className="text-xs rounded px-2 py-1 outline-none shrink-0"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
            <option value="text">Text</option>
            <option value="email">Email</option>
            <option value="tel">Phone</option>
            <option value="number">Number</option>
            <option value="textarea">Textarea</option>
          </select>
          <label className="flex items-center gap-1 text-[10px] shrink-0" style={{ color: "var(--text-muted)" }}>
            <input type="checkbox" checked={f.required}
              onChange={(e) => update(fields.map((ff, j) => j === i ? { ...ff, required: e.target.checked } : ff))} />
            Req
          </label>
          <button onClick={() => update(fields.filter((_, j) => j !== i))}
            className="shrink-0" style={{ color: "var(--danger)" }}>
            <X size={12} />
          </button>
        </div>
      ))}
      <button onClick={addField}
        className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg w-full justify-center"
        style={{ border: "1px dashed var(--border)", color: "var(--primary)", background: "transparent" }}>
        <Plus size={11} /> Add Field
      </button>
    </div>
  );
}

/* ── Block content fields ────────────────────────────────── */
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
        </>
      );
    case "contact":
      return (
        <>
          <Field label="Section Heading"><Input value={d.heading ?? ""} onChange={(v) => set("heading", v)} placeholder="Get in touch" /></Field>
          <Field label="Email"><Input value={d.email ?? ""} onChange={(v) => set("email", v)} placeholder="hello@example.com" /></Field>
          <Field label="Phone"><Input value={d.phone ?? ""} onChange={(v) => set("phone", v)} placeholder="+1 234 567 8900" /></Field>
          <Field label="Address"><Textarea value={d.address ?? ""} onChange={(v) => set("address", v)} rows={2} placeholder="123 Main St, City" /></Field>
        </>
      );
    case "form":
      return (
        <>
          <Field label="Form Heading"><Input value={d.heading ?? ""} onChange={(v) => set("heading", v)} placeholder="Contact Us" /></Field>
          <Field label="Submit Button Label"><Input value={d.submitLabel ?? ""} onChange={(v) => set("submitLabel", v)} placeholder="Send Message" /></Field>
          <Field label="Success Message"><Input value={d.successMsg ?? ""} onChange={(v) => set("successMsg", v)} placeholder="Thanks! We'll be in touch." /></Field>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>Form Fields</label>
            <FormFieldBuilder value={d.fields ?? "[]"} onChange={(v) => set("fields", v)} />
          </div>
        </>
      );
    case "footer":
      return (
        <>
          <Field label="Brand / Logo Text"><Input value={d.logo ?? ""} onChange={(v) => set("logo", v)} placeholder="My Brand" /></Field>
          <Field label="Footer Links (comma separated)"><Input value={d.links ?? ""} onChange={(v) => set("links", v)} placeholder="Home,About,Privacy,Terms" /></Field>
          <Field label="Copyright Text"><Input value={d.copy ?? ""} onChange={(v) => set("copy", v)} placeholder={`© ${new Date().getFullYear()} My Brand`} /></Field>
        </>
      );
    case "text":
      return <Field label="Content"><Textarea value={d.content ?? ""} onChange={(v) => set("content", v)} rows={6} /></Field>;
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
      return <p className="text-xs" style={{ color: "var(--text-muted)" }}>Horizontal divider — use the Style tab to add spacing.</p>;
  }
}

/* ── Templates modal ─────────────────────────────────────── */
function TemplatesModal({ onApply, onClose }: {
  onApply: (blocks: Block[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  function apply() {
    const tpl = TEMPLATES.find((t) => t.id === selected);
    if (!tpl) return;
    const blocks: Block[] = tpl.blocks.map((b) => ({ ...b, id: uid() }));
    onApply(blocks);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-2xl rounded-2xl flex flex-col max-h-[80vh]"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>Page Templates</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Start from a pre-built layout. This will replace your current blocks.
            </p>
          </div>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}><X size={18} /></button>
        </div>

        {/* Grid */}
        <div className="overflow-y-auto flex-1 p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TEMPLATES.map((tpl) => (
            <button key={tpl.id}
              onClick={() => setSelected(tpl.id === selected ? null : tpl.id)}
              className="text-left p-4 rounded-xl transition-all"
              style={{
                border:     `2px solid ${selected === tpl.id ? "var(--primary)" : "var(--border)"}`,
                background: selected === tpl.id ? "var(--primary-dim)" : "var(--bg-raised)",
              }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{tpl.emoji}</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{tpl.name}</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                    style={{ background: "var(--bg-overlay)", color: "var(--text-muted)" }}>
                    {tpl.category} · {tpl.blocks.length} blocks
                  </span>
                </div>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{tpl.description}</p>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex justify-end gap-2 shrink-0"
          style={{ borderTop: "1px solid var(--border)" }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm"
            style={{ background: "var(--bg-raised)", color: "var(--text-soft)" }}>Cancel</button>
          <button onClick={apply} disabled={!selected}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40"
            style={{ background: "var(--primary)", color: "var(--text-inverse)" }}>
            <LayoutTemplate size={13} /> Apply Template
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Share / SEO modal ───────────────────────────────────── */
function ShareModal({ page, onClose }: { page: Page; onClose: () => void }) {
  const [seoTitle,  setSeoTitle]  = useState(page.seoTitle ?? "");
  const [seoDesc,   setSeoDesc]   = useState((page as Page & { seoDesc?: string }).seoDesc ?? "");
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [copied,    setCopied]    = useState(false);

  const url = typeof window !== "undefined"
    ? `${window.location.origin}/site/${page.slug}`
    : `/site/${page.slug}`;

  function copy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function saveMeta() {
    setSaving(true);
    await updatePageMeta(page.id, { seoTitle, seoDesc });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-5"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>Share & SEO</h2>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}><X size={16} /></button>
        </div>

        {/* URL */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>
            Public URL
            {page.status !== "published" && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px]"
                style={{ background: "var(--bg-overlay)", color: "var(--text-muted)" }}>
                Draft — not visible
              </span>
            )}
          </label>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs px-3 py-2 rounded-lg truncate"
              style={{ background: "var(--bg-raised)", color: "var(--text)", border: "1px solid var(--border)", fontFamily: "monospace" }}>
              {url}
            </code>
            <button onClick={copy}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
              style={{ background: "var(--primary-dim)", color: copied ? "var(--success)" : "var(--primary)" }}>
              {copied ? <Check size={11} /> : <Copy size={11} />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* SEO */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>SEO Settings</p>
          <Field label="Meta Title">
            <Input value={seoTitle} onChange={setSeoTitle} placeholder={page.title} />
          </Field>
          <Field label="Meta Description">
            <Textarea value={seoDesc} onChange={setSeoDesc} placeholder="Brief description shown in search results (150–160 chars)…" rows={2} />
          </Field>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            {seoDesc.length}/160 characters
          </p>
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm"
            style={{ background: "var(--bg-raised)", color: "var(--text-soft)" }}>Close</button>
          <button onClick={saveMeta} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
            style={{ background: "var(--primary)", color: "var(--text-inverse)" }}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : <Save size={13} />}
            {saved ? "Saved!" : "Save SEO"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Single block card ───────────────────────────────────── */
function BlockCard({
  block, isDragging, isDragOver,
  onDragStart, onDragOver, onDragEnd, onDrop,
  onDelete, onChange, onStyleChange,
}: {
  block:         Block;
  isDragging:    boolean;
  isDragOver:    boolean;
  onDragStart:   () => void;
  onDragOver:    (e: React.DragEvent) => void;
  onDragEnd:     () => void;
  onDrop:        () => void;
  onDelete:      () => void;
  onChange:      (data: Record<string, string>) => void;
  onStyleChange: (style: BlockStyle) => void;
}) {
  const [open, setOpen] = useState(true);
  const [tab,  setTab]  = useState<"content" | "style">("content");
  const def      = BLOCK_DEFS.find((d) => d.type === block.type)!;
  const Icon     = def.icon;
  const hasStyle = block.style && Object.values(block.style).some((v) => v !== undefined && v !== "");

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
      className="rounded-xl overflow-hidden transition-all"
      style={{
        border:     `1px solid ${isDragOver ? "var(--primary)" : "var(--border)"}`,
        background: "var(--bg-surface)",
        opacity:    isDragging ? 0.4 : 1,
        boxShadow:  isDragOver ? "0 0 0 2px var(--primary-dim)" : "none",
        transform:  isDragOver ? "scale(1.01)" : "scale(1)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 select-none"
        style={{ background: "var(--bg-raised)", borderBottom: open ? "1px solid var(--border)" : "none" }}>
        <div className="cursor-grab active:cursor-grabbing p-0.5 rounded"
          style={{ color: "var(--text-muted)", touchAction: "none" }}>
          <GripVertical size={14} />
        </div>
        <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => setOpen((o) => !o)}>
          <div className="w-6 h-6 rounded-md flex items-center justify-center relative"
            style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
            <Icon size={12} />
            {hasStyle && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                style={{ background: "var(--primary)" }} />
            )}
          </div>
          <span className="text-sm font-medium flex-1" style={{ color: "var(--text)" }}>{def.label}</span>
          {open ? <ChevronUp size={13} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={13} style={{ color: "var(--text-muted)" }} />}
        </div>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1 rounded ml-1" style={{ color: "var(--danger)" }}>
          <Trash2 size={13} />
        </button>
      </div>

      {/* Tabs + content */}
      {open && (
        <>
          <div className="flex" style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-raised)" }}>
            {(["content", "style"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium capitalize"
                style={{
                  color:        tab === t ? "var(--primary)" : "var(--text-soft)",
                  borderBottom: tab === t ? "2px solid var(--primary)" : "2px solid transparent",
                  marginBottom: -1,
                  background:   "transparent",
                }}>
                {t === "style" && <Sliders size={10} />}
                {t}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-4 p-4">
            {tab === "content"
              ? <BlockFields block={block} onChange={onChange} />
              : <StylePanel  style={block.style ?? {}} onChange={onStyleChange} />}
          </div>
        </>
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
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left"
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
  const [blocks,         setBlocks]         = useState<Block[]>(() => {
    try { return JSON.parse(page.blocks) as Block[]; } catch { return []; }
  });
  const [status,         setStatus]         = useState(page.status as "draft" | "published");
  const [saved,          setSaved]          = useState(false);
  const [showTemplates,  setShowTemplates]  = useState(false);
  const [showShare,      setShowShare]      = useState(false);
  const [isPending,      startTransition]   = useTransition();

  const dragIndex  = useRef<number>(-1);
  const [dragOver, setDragOver] = useState<number>(-1);

  function addBlock(type: BlockType) {
    const def = BLOCK_DEFS.find((d) => d.type === type)!;
    setBlocks((prev) => [...prev, { id: uid(), type, data: { ...def.defaults } }]);
  }

  function updateBlock(id: string, data: Record<string, string>) {
    setBlocks((prev) => prev.map((b) => b.id === id ? { ...b, data } : b));
  }

  function updateBlockStyle(id: string, style: BlockStyle) {
    setBlocks((prev) => prev.map((b) => b.id === id ? { ...b, style } : b));
  }

  function deleteBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  function handleDrop(dropIdx: number) {
    const from = dragIndex.current;
    if (from === -1 || from === dropIdx) return;
    setBlocks((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(dropIdx, 0, moved);
      return next;
    });
    dragIndex.current = -1;
    setDragOver(-1);
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
            className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-muted)" }}>
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
          {/* Templates */}
          <button onClick={() => setShowTemplates(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "var(--bg-overlay)", color: "var(--text-soft)", border: "1px solid var(--border)" }}
            title="Start from a template">
            <LayoutTemplate size={12} /> Templates
          </button>

          {/* Share */}
          <button onClick={() => setShowShare(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "var(--bg-overlay)", color: "var(--text-soft)", border: "1px solid var(--border)" }}>
            <Share2 size={12} /> Share
          </button>

          {/* Publish / Unpublish */}
          {status === "published" && (
            <a href={`/site/${page.slug}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: "var(--bg-overlay)", color: "var(--text-soft)", border: "1px solid var(--border)" }}>
              <ExternalLink size={12} /> View
            </a>
          )}
          <button onClick={() => save(status === "published" ? "draft" : "published")} disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "var(--bg-overlay)", color: "var(--text-soft)", border: "1px solid var(--border)" }}>
            {status === "published" ? <FileX size={12} /> : <Globe size={12} />}
            {status === "published" ? "Unpublish" : "Publish"}
          </button>

          {/* Save */}
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
              <LayoutTemplate size={24} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm mb-2">No blocks yet.</p>
              <button onClick={() => setShowTemplates(true)}
                className="text-xs font-semibold" style={{ color: "var(--primary)" }}>
                Start from a template →
              </button>
            </div>
          )}

          {blocks.map((block, i) => (
            <BlockCard
              key={block.id}
              block={block}
              isDragging={dragIndex.current === i}
              isDragOver={dragOver === i}
              onDragStart={() => { dragIndex.current = i; }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(i); }}
              onDragEnd={() => { dragIndex.current = -1; setDragOver(-1); }}
              onDrop={() => handleDrop(i)}
              onDelete={() => deleteBlock(block.id)}
              onChange={(data) => updateBlock(block.id, data)}
              onStyleChange={(style) => updateBlockStyle(block.id, style)}
            />
          ))}

          <AddBlockPicker onAdd={addBlock} />
        </div>
      </div>

      {/* Modals */}
      {showTemplates && (
        <TemplatesModal
          onApply={(tplBlocks) => setBlocks(tplBlocks)}
          onClose={() => setShowTemplates(false)}
        />
      )}
      {showShare && (
        <ShareModal page={page} onClose={() => setShowShare(false)} />
      )}
    </div>
  );
}

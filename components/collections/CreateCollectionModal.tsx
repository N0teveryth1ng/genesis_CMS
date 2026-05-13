"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  X, Database, FileText, Users, Image, ShoppingCart,
  Tag, Mail, Calendar, Globe, BarChart2, Bookmark,
  MessageSquare, Package, Star, Heart, Zap, Music,
  Loader2, AlertCircle,
} from "lucide-react";
import { createCollection } from "@/lib/actions/collections";
import { slugify } from "@/lib/utils";

/* ── Icon picker ─────────────────────────────────────────── */
const ICONS = [
  { name: "Database",      Icon: Database      },
  { name: "FileText",      Icon: FileText      },
  { name: "Users",         Icon: Users         },
  { name: "Image",         Icon: Image         },
  { name: "ShoppingCart",  Icon: ShoppingCart  },
  { name: "Tag",           Icon: Tag           },
  { name: "Mail",          Icon: Mail          },
  { name: "Calendar",      Icon: Calendar      },
  { name: "Globe",         Icon: Globe         },
  { name: "BarChart2",     Icon: BarChart2     },
  { name: "Bookmark",      Icon: Bookmark      },
  { name: "MessageSquare", Icon: MessageSquare },
  { name: "Package",       Icon: Package       },
  { name: "Star",          Icon: Star          },
  { name: "Heart",         Icon: Heart         },
  { name: "Zap",           Icon: Zap           },
  { name: "Music",         Icon: Music         },
];

interface Props { onClose: () => void }

export default function CreateCollectionModal({ onClose }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error,     setError]        = useState<string | null>(null);
  const [label,     setLabel]        = useState("");
  const [icon,      setIcon]         = useState("Database");
  const formRef = useRef<HTMLFormElement>(null);

  const slug = slugify(label);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const data = new FormData(formRef.current!);

    startTransition(async () => {
      try {
        const res = await createCollection(data);
        if (res.ok) {
          router.push(`/collections/${res.collection.id}`);
          onClose();
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  /* Selected icon component */
  const SelectedIcon = ICONS.find((i) => i.name === icon)?.Icon ?? Database;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-200 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl animate-fade-in"
        style={{
          background: "var(--bg-raised)",
          border:     "1px solid var(--border-light)",
          boxShadow:  "var(--shadow-lg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
              <SelectedIcon size={16} />
            </div>
            <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              New Collection
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-overlay)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}>
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form ref={formRef} onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          {error && (
            <div className="flex items-center gap-2.5 rounded-lg px-4 py-3 text-sm"
              style={{ background: "rgba(255,77,106,0.1)", border: "1px solid rgba(255,77,106,0.2)", color: "var(--danger)" }}>
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {/* Label */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>
              Label <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <input
              name="label"
              type="text"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Blog Posts"
              className="rounded-lg px-3 py-2.5 text-sm outline-none transition-all"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
              onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--primary)"; }}
              onBlur={(e)  => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
            />
            {slug && (
              <p className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>
                name: <span style={{ color: "var(--primary)" }}>{slug}</span>
              </p>
            )}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>
              Description
            </label>
            <textarea
              name="description"
              rows={2}
              placeholder="Optional description"
              className="rounded-lg px-3 py-2.5 text-sm outline-none resize-none transition-all"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
              onFocus={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = "var(--primary)"; }}
              onBlur={(e)  => { (e.target as HTMLTextAreaElement).style.borderColor = "var(--border)"; }}
            />
          </div>

          {/* Icon picker */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>Icon</label>
            <input type="hidden" name="icon" value={icon} />
            <div className="grid grid-cols-9 gap-1.5">
              {ICONS.map(({ name, Icon }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setIcon(name)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  style={{
                    background: icon === name ? "var(--primary-dim)" : "var(--bg-surface)",
                    border:     `1px solid ${icon === name ? "var(--primary)" : "var(--border)"}`,
                    color:      icon === name ? "var(--primary)"     : "var(--text-muted)",
                  }}
                  title={name}
                >
                  <Icon size={14} />
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors"
              style={{ background: "var(--bg-overlay)", color: "var(--text-soft)", border: "1px solid var(--border)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !label.trim()}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all disabled:opacity-50"
              style={{ background: "var(--primary)", color: "var(--text-inverse)" }}
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {isPending ? "Creating…" : "Create Collection"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

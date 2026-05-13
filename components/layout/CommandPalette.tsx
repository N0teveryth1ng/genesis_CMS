"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search, LayoutGrid, Database, FolderOpen, Users,
  Settings, Zap, BarChart2, Shield, Key, Globe,
  ArrowRight, Hash,
} from "lucide-react";
import { useUIStore } from "@/lib/stores/ui";
import { cn } from "@/lib/utils";

/* ── Nav items searchable in palette ───────────────────────── */
const ITEMS = [
  { label: "Overview",    href: "/",           icon: LayoutGrid, group: "Navigate" },
  { label: "Collections", href: "/collections", icon: Database,   group: "Navigate" },
  { label: "Files",       href: "/files",       icon: FolderOpen, group: "Navigate" },
  { label: "Flows",       href: "/flows",       icon: Zap,        group: "Navigate" },
  { label: "Insights",    href: "/insights",    icon: BarChart2,  group: "Navigate" },
  { label: "Users",       href: "/users",       icon: Users,      group: "System"   },
  { label: "Roles",       href: "/roles",       icon: Shield,     group: "System"   },
  { label: "API Keys",    href: "/api-keys",    icon: Key,        group: "System"   },
  { label: "Webhooks",    href: "/webhooks",    icon: Globe,      group: "System"   },
  { label: "Settings",    href: "/settings",    icon: Settings,   group: "System"   },
];

export default function CommandPalette() {
  const { cmdOpen, closeCmd } = useUIStore();
  const router   = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query,    setQuery]    = useState("");
  const [selected, setSelected] = useState(0);

  const filtered = query.trim()
    ? ITEMS.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()))
    : ITEMS;

  /* Focus input on open */
  useEffect(() => {
    if (cmdOpen) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [cmdOpen]);

  /* Reset selected when filtered changes */
  useEffect(() => { setSelected(0); }, [query]);

  /* Keyboard nav */
  useEffect(() => {
    if (!cmdOpen) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape")    { closeCmd(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, filtered.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
      if (e.key === "Enter") {
        e.preventDefault();
        const item = filtered[selected];
        if (item) { router.push(item.href); closeCmd(); }
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cmdOpen, filtered, selected, router, closeCmd]);

  if (!cmdOpen) return null;

  /* Group items */
  const groups = Array.from(new Set(filtered.map((i) => i.group)));

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh] px-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={closeCmd}
    >
      {/* Panel */}
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden animate-fade-in"
        style={{
          background: "var(--bg-raised)",
          border:     "1px solid var(--border-light)",
          boxShadow:  "var(--shadow-lg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div
          className="flex items-center gap-3 px-4 py-3.5 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <Search size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, actions…"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "var(--text)" }}
          />
          <kbd
            className="text-[10px] px-1.5 py-0.5 rounded font-mono"
            style={{ background: "var(--border)", color: "var(--text-muted)" }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10">
              <Hash size={20} style={{ color: "var(--text-muted)" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No results for &quot;{query}&quot;</p>
            </div>
          ) : (
            groups.map((group) => {
              const groupItems = filtered.filter((i) => i.group === group);
              return (
                <div key={group} className="mb-1">
                  <p
                    className="px-4 py-1.5 text-[10px] font-semibold tracking-widest uppercase"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {group}
                  </p>
                  {groupItems.map((item) => {
                    const globalIdx = filtered.indexOf(item);
                    const isActive  = globalIdx === selected;
                    return (
                      <button
                        key={item.href}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left transition-colors"
                        style={{
                          background: isActive ? "var(--primary-dim)" : "transparent",
                          color:      isActive ? "var(--primary)"     : "var(--text-soft)",
                        }}
                        onMouseEnter={() => setSelected(globalIdx)}
                        onClick={() => { router.push(item.href); closeCmd(); }}
                      >
                        <item.icon size={15} className="shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {isActive && <ArrowRight size={13} style={{ color: "var(--primary)" }} />}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div
          className="flex items-center gap-4 px-4 py-2 border-t"
          style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
        >
          {[
            ["↑↓", "navigate"],
            ["↵",  "select"],
            ["ESC","close"],
          ].map(([key, desc]) => (
            <span key={key} className="flex items-center gap-1 text-[11px]">
              <kbd
                className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                style={{ background: "var(--border)" }}
              >{key}</kbd>
              {desc}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

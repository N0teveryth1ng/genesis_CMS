"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, Plus, Check, Loader2 } from "lucide-react";
import { createWorkspace, switchWorkspace } from "@/lib/actions/workspaces";
import { useUIStore } from "@/lib/stores/ui";

type Workspace = { id: string; name: string; plan: string };

const PLAN_COLOR: Record<string, string> = {
  free: "var(--text-muted)", pro: "var(--primary)", enterprise: "#f59e0b",
};

export default function WorkspaceSwitcher({
  workspaces,
  collapsed,
}: {
  workspaces: Workspace[];
  collapsed: boolean;
}) {
  const router = useRouter();
  const [open, setOpen]           = useState(false);
  const [creating, setCreating]   = useState(false);
  const [newName, setNewName]     = useState("");
  const [isPending, start]        = useTransition();
  const activeId    = useUIStore((s) => s.activeWorkspaceId);
  const setActiveId = useUIStore((s) => s.setActiveWorkspace);

  const active = workspaces.find((w) => w.id === activeId) ?? workspaces[0];

  function handleCreate() {
    if (!newName.trim()) return;
    start(async () => {
      const ws = await createWorkspace(newName.trim());
      setActiveId(ws.id);
      setNewName("");
      setCreating(false);
      setOpen(false);
      router.refresh();
    });
  }

  if (workspaces.length === 0) return null;

  return (
    <div className="relative px-2 mb-1">
      <button
        onClick={() => setOpen((o) => !o)}
        title={collapsed ? (active?.name ?? "Workspace") : undefined}
        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg transition-all duration-150"
        style={{
          background: open ? "var(--bg-overlay)" : "var(--bg-raised)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg,#00C8F8,#7B61FF)" }}>
          <Building2 size={12} className="text-white" />
        </div>
        {!collapsed && (
          <>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>
                {active?.name ?? "No workspace"}
              </p>
              {active && (
                <p className="text-[10px] capitalize" style={{ color: PLAN_COLOR[active.plan] ?? "var(--text-muted)" }}>
                  {active.plan}
                </p>
              )}
            </div>
            <ChevronDown size={12} style={{ color: "var(--text-muted)", transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }} />
          </>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => { setOpen(false); setCreating(false); }} />
          <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl overflow-hidden shadow-2xl"
            style={{ background: "var(--bg-raised)", border: "1px solid var(--border-light)" }}>
            <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}>Workspaces</p>

            {workspaces.map((ws) => (
              <button key={ws.id}
                onClick={() => { setActiveId(ws.id); setOpen(false); switchWorkspace(ws.id).then(() => router.refresh()); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left"
                style={{ color: "var(--text-soft)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-overlay)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}>
                <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg,#00C8F8,#7B61FF)" }}>
                  <Building2 size={10} className="text-white" />
                </div>
                <span className="flex-1 text-xs font-medium truncate">{ws.name}</span>
                {(activeId === ws.id || (!activeId && ws === workspaces[0])) && (
                  <Check size={11} style={{ color: "var(--primary)", flexShrink: 0 }} />
                )}
              </button>
            ))}

            <div className="my-1 mx-3" style={{ height: "1px", background: "var(--border)" }} />

            {creating ? (
              <div className="px-3 pb-3 flex gap-2">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setCreating(false); }}
                  placeholder="Workspace name"
                  className="flex-1 text-xs rounded-lg px-2 py-1.5 outline-none"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                />
                <button onClick={handleCreate} disabled={!newName.trim() || isPending}
                  className="px-2 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                  style={{ background: "var(--primary)", color: "#fff" }}>
                  {isPending ? <Loader2 size={11} className="animate-spin" /> : "Add"}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs"
                style={{ color: "var(--primary)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--primary-dim)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}>
                <Plus size={12} /> New workspace
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

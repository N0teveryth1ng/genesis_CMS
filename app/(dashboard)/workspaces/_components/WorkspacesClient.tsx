"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Trash2, Crown, Shield, User2,
  Building2, Loader2, Check, X, Mail, Sparkles,
} from "lucide-react";
import {
  createWorkspace, updateWorkspace, deleteWorkspace,
  inviteMember, removeMember,
} from "@/lib/actions/workspaces";
import { useUIStore } from "@/lib/stores/ui";

type Member = { id: string; userEmail: string; role: string; invitedAt: Date };
type Workspace = {
  id: string; name: string; slug: string; plan: string;
  createdAt: Date; updatedAt: Date; members: Member[];
};

const PLAN_BADGE: Record<string, { label: string; color: string }> = {
  free:       { label: "Free",       color: "var(--text-muted)"  },
  pro:        { label: "Pro",        color: "var(--primary)"     },
  enterprise: { label: "Enterprise", color: "#f59e0b"            },
};

const ROLE_ICON: Record<string, React.ElementType> = {
  owner: Crown, admin: Shield, member: User2,
};

function PlanBadge({ plan }: { plan: string }) {
  const cfg = PLAN_BADGE[plan] ?? PLAN_BADGE.free;
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
      style={{ background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
      {cfg.label}
    </span>
  );
}

function MemberRow({ member, onRemove }: { member: Member; onRemove: () => void }) {
  const Icon = ROLE_ICON[member.role] ?? User2;
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{ background: "var(--bg-raised)", border: "1px solid var(--border)" }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{member.userEmail}</p>
        <p className="text-[11px] capitalize" style={{ color: "var(--text-muted)" }}>{member.role}</p>
      </div>
      {member.role !== "owner" && (
        <button
          onClick={() => { if (confirming) onRemove(); else setConfirming(true); }}
          onMouseLeave={() => setConfirming(false)}
          className="text-xs px-2 py-1 rounded-lg"
          style={{ background: confirming ? "var(--danger)" : "var(--bg-overlay)", color: confirming ? "#fff" : "var(--danger)" }}>
          {confirming ? "Sure?" : "Remove"}
        </button>
      )}
    </div>
  );
}

function WorkspaceCard({
  ws, isActive, onSelect, onDeleted,
}: {
  ws: Workspace; isActive: boolean; onSelect: () => void; onDeleted: () => void;
}) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [editing, setEditing]   = useState(false);
  const [name, setName]         = useState(ws.name);
  const [plan, setPlan]         = useState(ws.plan);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole]   = useState("member");
  const [inviting, setInviting]       = useState(false);
  const [confirmDel, setConfirmDel]   = useState(false);

  async function save() {
    start(async () => {
      await updateWorkspace(ws.id, { name, plan });
      setEditing(false);
      router.refresh();
    });
  }

  async function handleDelete() {
    if (!confirmDel) { setConfirmDel(true); return; }
    start(async () => { await deleteWorkspace(ws.id); onDeleted(); router.refresh(); });
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    await inviteMember(ws.id, inviteEmail.trim(), inviteRole);
    setInviteEmail("");
    setInviting(false);
    router.refresh();
  }

  return (
    <div
      className="rounded-2xl flex flex-col gap-0 overflow-hidden transition-all duration-150"
      style={{
        border: `1px solid ${isActive ? "var(--primary)" : "var(--border)"}`,
        background: "var(--bg-surface)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer"
        style={{ background: isActive ? "var(--primary-dim)" : "transparent" }}
        onClick={onSelect}
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg,#00C8F8,#7B61FF)" }}>
          <Building2 size={16} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="text-sm font-semibold rounded px-2 py-0.5 outline-none w-full"
              style={{ background: "var(--bg-raised)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          ) : (
            <p className="text-sm font-semibold truncate" style={{ color: isActive ? "var(--primary)" : "var(--text)" }}>
              {ws.name}
            </p>
          )}
          <div className="flex items-center gap-2 mt-0.5">
            <PlanBadge plan={editing ? plan : ws.plan} />
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              {ws.members.length} member{ws.members.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {editing ? (
            <>
              <button onClick={save} disabled={isPending}
                className="p-1.5 rounded-lg" style={{ background: "var(--primary)", color: "#fff" }}>
                {isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              </button>
              <button onClick={() => { setEditing(false); setName(ws.name); setPlan(ws.plan); }}
                className="p-1.5 rounded-lg" style={{ background: "var(--bg-raised)", color: "var(--text-muted)" }}>
                <X size={12} />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)}
                className="text-xs px-2 py-1 rounded-lg"
                style={{ background: "var(--bg-raised)", color: "var(--text-soft)", border: "1px solid var(--border)" }}>
                Edit
              </button>
              <button
                onClick={handleDelete}
                onMouseLeave={() => setConfirmDel(false)}
                disabled={isPending}
                className="text-xs px-2 py-1 rounded-lg"
                style={{ background: confirmDel ? "var(--danger)" : "var(--bg-raised)", color: confirmDel ? "#fff" : "var(--danger)", border: "1px solid var(--border)" }}>
                {confirmDel ? "Sure?" : <Trash2 size={12} />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Plan selector when editing */}
      {editing && (
        <div className="px-5 pb-4 flex gap-2 border-t" style={{ borderColor: "var(--border)" }}>
          {["free", "pro", "enterprise"].map((p) => (
            <button key={p} onClick={() => setPlan(p)}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize"
              style={{
                background: plan === p ? "var(--primary)" : "var(--bg-raised)",
                color: plan === p ? "#fff" : "var(--text-soft)",
                border: "1px solid var(--border)",
              }}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Members (only when active) */}
      {isActive && !editing && (
        <div className="flex flex-col gap-3 px-5 pb-5 border-t pt-4" style={{ borderColor: "var(--border)" }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Members
          </p>
          <div className="flex flex-col gap-2">
            {ws.members.length === 0 && (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>No members yet.</p>
            )}
            {ws.members.map((m) => (
              <MemberRow key={m.id} member={m} onRemove={() => { start(async () => { await removeMember(m.id); router.refresh(); }); }} />
            ))}
          </div>

          {/* Invite */}
          <form onSubmit={handleInvite} className="flex gap-2 mt-1">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@example.com"
              className="flex-1 text-sm rounded-lg px-3 py-2 outline-none"
              style={{ background: "var(--bg-raised)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="text-sm rounded-lg px-2 py-2 outline-none"
              style={{ background: "var(--bg-raised)", border: "1px solid var(--border)", color: "var(--text)" }}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" disabled={inviting || !inviteEmail.trim()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
              style={{ background: "var(--primary)", color: "#fff" }}>
              {inviting ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
              Invite
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function WorkspacesClient({ workspaces: initial }: { workspaces: Workspace[] }) {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState(initial);
  const activeId    = useUIStore((s) => s.activeWorkspaceId);
  const setActiveId = useUIStore((s) => s.setActiveWorkspace);
  const [creating, setCreating]     = useState(false);
  const [newName, setNewName]       = useState("");
  const [isPending, start]          = useTransition();

  function handleCreate() {
    if (!newName.trim()) return;
    start(async () => {
      const ws = await createWorkspace(newName.trim());
      setNewName("");
      setCreating(false);
      setActiveId(ws.id);
      router.refresh();
    });
  }

  return (
    <div className="p-6 max-w-3xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Workspaces</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            Isolated environments for different clients or projects.
          </p>
        </div>
        <button onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: "var(--primary)", color: "#fff" }}>
          <Plus size={14} /> New Workspace
        </button>
      </div>

      {/* Create */}
      {creating && (
        <div className="flex items-center gap-2 p-4 rounded-xl"
          style={{ border: "1px solid var(--primary)", background: "var(--primary-dim)" }}>
          <Building2 size={16} style={{ color: "var(--primary)", flexShrink: 0 }} />
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setCreating(false); }}
            placeholder="Workspace name (e.g. Acme Corp)"
            className="flex-1 text-sm rounded-lg px-3 py-2 outline-none"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
          <button onClick={handleCreate} disabled={!newName.trim() || isPending}
            className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            style={{ background: "var(--primary)", color: "#fff" }}>
            {isPending ? <Loader2 size={13} className="animate-spin" /> : "Create"}
          </button>
          <button onClick={() => setCreating(false)} className="p-2 rounded-lg" style={{ color: "var(--text-muted)" }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* List */}
      {workspaces.length === 0 && !creating ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl gap-4"
          style={{ border: "2px dashed var(--border)", color: "var(--text-muted)" }}>
          <Sparkles size={32} style={{ opacity: 0.4 }} />
          <p className="text-sm font-medium">No workspaces yet</p>
          <button onClick={() => setCreating(true)} className="text-xs font-semibold" style={{ color: "var(--primary)" }}>
            Create your first →
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {workspaces.map((ws) => (
            <WorkspaceCard
              key={ws.id}
              ws={ws as unknown as Workspace}
              isActive={activeId === ws.id}
              onSelect={() => setActiveId(ws.id)}
              onDeleted={() => {
                setWorkspaces((prev) => prev.filter((w) => w.id !== ws.id));
                if (activeId === ws.id) setActiveId(null);
              }}
            />
          ))}
        </div>
      )}

      {/* Info */}
      <div className="p-4 rounded-xl text-sm" style={{ background: "var(--bg-raised)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
        <strong style={{ color: "var(--text)" }}>How workspaces work:</strong>{" "}
        Each workspace is an isolated environment with its own members and plan. Switch between workspaces using the switcher in the sidebar. Full data isolation (scoping pages and content to a workspace) can be enabled per plan.
      </div>
    </div>
  );
}

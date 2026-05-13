"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Trash2, Edit2, Loader2, Users, ShieldCheck, Eye } from "lucide-react";
import { deleteUser } from "@/lib/actions/users";
import UserFormModal from "./UserFormModal";

type User = {
  id: string; name: string; email: string;
  role: string; active: boolean; createdAt: Date; avatar: string | null;
};

const ROLE_STYLES: Record<string, { bg: string; color: string; icon: React.ElementType }> = {
  admin:  { bg: "rgba(0,200,248,0.12)",  color: "var(--primary)", icon: ShieldCheck },
  editor: { bg: "rgba(123,97,255,0.12)", color: "#7B61FF",        icon: Edit2 },
  viewer: { bg: "var(--bg-raised)",      color: "var(--text-muted)", icon: Eye },
};

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div
      className="rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
      style={{
        width:      size,
        height:     size,
        background: "linear-gradient(135deg, var(--primary), #7B61FF)",
        color:      "#fff",
      }}
    >
      {initials}
    </div>
  );
}

function UserRow({
  user,
  currentUserId,
  currentUserRole,
  onEdit,
}: {
  user: User;
  currentUserId: string;
  currentUserRole: string;
  onEdit: (u: User) => void;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const role = ROLE_STYLES[user.role] ?? ROLE_STYLES.viewer;
  const RoleIcon = role.icon;
  const isSelf = user.id === currentUserId;
  const isAdmin = currentUserRole === "admin";

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirming) { setConfirming(true); return; }
    startTransition(async () => {
      try {
        await deleteUser(user.id, currentUserId);
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Delete failed");
        setConfirming(false);
      }
    });
  }

  return (
    <div
      className="group flex items-center gap-4 px-5 py-3.5 transition-colors"
      style={{ borderBottom: "1px solid var(--border)" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--bg-overlay)"; }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = "transparent";
        setConfirming(false);
        setError(null);
      }}
    >
      {/* Avatar + Name */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar name={user.name} />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>
            {user.name}
            {isSelf && (
              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full"
                style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
                You
              </span>
            )}
          </p>
          <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{user.email}</p>
        </div>
      </div>

      {/* Role badge */}
      <span
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0"
        style={{ background: role.bg, color: role.color }}
      >
        <RoleIcon size={11} /> {user.role}
      </span>

      {/* Status */}
      <span
        className="px-2.5 py-1 rounded-full text-xs font-semibold shrink-0"
        style={{
          background: user.active ? "rgba(0,214,143,0.12)" : "var(--bg-raised)",
          color:      user.active ? "var(--success)"        : "var(--text-muted)",
        }}
      >
        {user.active ? "Active" : "Inactive"}
      </span>

      {/* Joined */}
      <span className="text-xs shrink-0 w-24 text-right" style={{ color: "var(--text-muted)" }}>
        {new Date(user.createdAt).toLocaleDateString()}
      </span>

      {/* Error */}
      {error && <span className="text-xs shrink-0" style={{ color: "var(--danger)" }}>{error}</span>}

      {/* Actions — admin only */}
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
      {!isAdmin ? null : <>
        <button
          onClick={() => onEdit(user)}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium"
          style={{ background: "var(--bg-raised)", color: "var(--text-soft)" }}
        >
          <Edit2 size={11} /> Edit
        </button>
        {!isSelf && (
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all"
            style={{
              background: confirming ? "var(--danger)" : "var(--bg-raised)",
              color:      confirming ? "#fff"          : "var(--danger)",
            }}
          >
            {isPending ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
            {confirming ? "Sure?" : "Delete"}
          </button>
        )}
        </>}
      </div>
    </div>
  );
}

export default function UsersClient({
  users,
  currentUserId,
  currentUserRole,
}: {
  users: User[];
  currentUserId: string;
  currentUserRole: string;
}) {
  const [modal, setModal] = useState<User | null | "new">(null);
  const isAdmin = currentUserRole === "admin";

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Users</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            {users.length} member{users.length !== 1 ? "s" : ""}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setModal("new")}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
            style={{ background: "var(--primary)", color: "var(--text-inverse)" }}
          >
            <UserPlus size={15} /> Invite User
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--border)", background: "var(--bg-surface)" }}>
        {/* Table header */}
        <div
          className="flex items-center gap-4 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider"
          style={{ background: "var(--bg-raised)", borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}
        >
          <span className="flex-1">Name / Email</span>
          <span className="w-20">Role</span>
          <span className="w-20">Status</span>
          <span className="w-24 text-right">Joined</span>
          <span className="w-24" />
        </div>

        {users.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
              <Users size={22} />
            </div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No users yet.</p>
          </div>
        ) : (
          users.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              onEdit={(u) => setModal(u)}
            />
          ))
        )}
      </div>

      {isAdmin && modal !== null && (
        <UserFormModal
          user={modal === "new" ? null : modal}
          currentUserId={currentUserId}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

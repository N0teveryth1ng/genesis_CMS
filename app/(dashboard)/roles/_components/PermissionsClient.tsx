"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Shield, Loader2, RotateCcw } from "lucide-react";
import { upsertPermission, resetPermissions } from "@/lib/actions/permissions";
import type { Permission } from "@prisma/client";

type Collection = { id: string; name: string; label: string };

const ROLES = ["editor", "viewer"] as const;
type Role = (typeof ROLES)[number];

const ROLE_DEFAULTS: Record<Role, Record<string, boolean>> = {
  editor: { canRead: true,  canCreate: true,  canUpdate: true,  canDelete: false },
  viewer: { canRead: true,  canCreate: false, canUpdate: false, canDelete: false },
};

const ACTIONS = [
  { key: "canRead",   label: "Read"   },
  { key: "canCreate", label: "Create" },
  { key: "canUpdate", label: "Update" },
  { key: "canDelete", label: "Delete" },
] as const;

const ROLE_COLORS: Record<Role, { bg: string; color: string }> = {
  editor: { bg: "rgba(123,97,255,0.12)", color: "#7B61FF" },
  viewer: { bg: "var(--bg-raised)",      color: "var(--text-muted)" },
};

/* ── Permission toggle cell ──────────────────────────────── */
function PermCell({
  role, collection, actionKey, checked,
}: {
  role: Role;
  collection: Collection;
  actionKey: string;
  checked: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(checked);

  function toggle() {
    const next = !value;
    setValue(next);
    startTransition(async () => {
      await upsertPermission(role, collection.id, { [actionKey]: next } as Record<string, boolean>);
      router.refresh();
    });
  }

  return (
    <td className="px-4 py-3 text-center">
      {isPending ? (
        <Loader2 size={14} className="animate-spin mx-auto" style={{ color: "var(--text-muted)" }} />
      ) : (
        <button
          onClick={toggle}
          className="relative w-9 h-5 rounded-full transition-all duration-200 mx-auto block"
          style={{ background: value ? "var(--primary)" : "var(--border-light)" }}
        >
          <span
            className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200"
            style={{ background: "#fff", left: value ? "calc(100% - 18px)" : "2px", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}
          />
        </button>
      )}
    </td>
  );
}

/* ── Reset button ────────────────────────────────────────── */
function ResetButton({ role, collection }: { role: Role; collection: Collection }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleReset() {
    startTransition(async () => {
      await resetPermissions(role, collection.id);
      router.refresh();
    });
  }

  return (
    <td className="px-4 py-3 text-center">
      <button
        onClick={handleReset}
        disabled={isPending}
        title="Reset to defaults"
        className="p-1.5 rounded-md transition-colors mx-auto block disabled:opacity-40"
        style={{ color: "var(--text-muted)", background: "var(--bg-raised)" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
      >
        {isPending ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
      </button>
    </td>
  );
}

/* ── Role table ──────────────────────────────────────────── */
function RoleTable({
  role,
  collections,
  permissions,
}: {
  role: Role;
  collections: Collection[];
  permissions: Permission[];
}) {
  const style = ROLE_COLORS[role];
  const defaults = ROLE_DEFAULTS[role];

  function getChecked(collectionId: string, actionKey: string) {
    const perm = permissions.find((p) => p.role === role && p.collectionId === collectionId);
    if (!perm) return defaults[actionKey] ?? false;
    return (perm as unknown as Record<string, boolean>)[actionKey] ?? false;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Role header */}
      <div className="flex items-center gap-2">
        <span className="px-3 py-1 rounded-full text-xs font-semibold capitalize"
          style={{ background: style.bg, color: style.color }}>
          {role}
        </span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {role === "editor" ? "Can create + edit by default. Customize per collection below." : "Read-only by default. Grant write access per collection below."}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--border)", background: "var(--bg-surface)" }}>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ background: "var(--bg-raised)", borderBottom: "1px solid var(--border)" }}>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}>
                Collection
              </th>
              {ACTIONS.map((a) => (
                <th key={a.key} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-center"
                  style={{ color: "var(--text-muted)", width: "80px" }}>
                  {a.label}
                </th>
              ))}
              <th className="px-4 py-2.5 w-12" />
            </tr>
          </thead>
          <tbody>
            {collections.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                  No collections yet.
                </td>
              </tr>
            ) : (
              collections.map((col) => (
                <tr key={col.id} style={{ borderBottom: "1px solid var(--border)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "var(--bg-overlay)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{col.label}</p>
                    <p className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>{col.name}</p>
                  </td>
                  {ACTIONS.map((a) => (
                    <PermCell
                      key={a.key}
                      role={role}
                      collection={col}
                      actionKey={a.key}
                      checked={getChecked(col.id, a.key)}
                    />
                  ))}
                  <ResetButton role={role} collection={col} />
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────── */
export default function PermissionsClient({
  collections,
  permissions,
}: {
  collections: Collection[];
  permissions: Permission[];
}) {
  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(0,214,143,0.12)", color: "var(--success)" }}>
          <Shield size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Roles & Permissions</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            Control what each role can do per collection. Admins always have full access.
          </p>
        </div>
      </div>

      {/* Admin note */}
      <div className="rounded-xl px-5 py-3 flex items-center gap-3"
        style={{ background: "rgba(0,200,248,0.08)", border: "1px solid rgba(0,200,248,0.2)" }}>
        <Shield size={14} style={{ color: "var(--primary)", flexShrink: 0 }} />
        <p className="text-xs" style={{ color: "var(--text-soft)" }}>
          <strong style={{ color: "var(--primary)" }}>Admin</strong> — always has full read, create, update, and delete access to all collections. Cannot be restricted.
        </p>
      </div>

      {ROLES.map((role) => (
        <RoleTable key={role} role={role} collections={collections} permissions={permissions} />
      ))}
    </div>
  );
}

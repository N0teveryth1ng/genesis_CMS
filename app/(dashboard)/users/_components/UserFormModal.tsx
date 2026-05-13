"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, AlertCircle, ShieldCheck, Edit2, Eye } from "lucide-react";
import { createUser, updateUser } from "@/lib/actions/users";

type User = {
  id: string; name: string; email: string;
  role: string; active: boolean;
};

const ROLES = [
  { value: "admin",  label: "Admin",  desc: "Full access to everything", icon: ShieldCheck, color: "var(--primary)" },
  { value: "editor", label: "Editor", desc: "Create and edit content",    icon: Edit2,       color: "#7B61FF" },
  { value: "viewer", label: "Viewer", desc: "Read-only access",           icon: Eye,         color: "var(--text-muted)" },
] as const;

export default function UserFormModal({
  user,
  currentUserId,
  onClose,
}: {
  user: User | null;
  currentUserId: string;
  onClose: () => void;
}) {
  const router  = useRouter();
  const editing = !!user;
  const isSelf  = user?.id === currentUserId;

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name,     setName]     = useState(user?.name     ?? "");
  const [email,    setEmail]    = useState(user?.email    ?? "");
  const [password, setPassword] = useState("");
  const [role,     setRole]     = useState(user?.role     ?? "viewer");
  const [active,   setActive]   = useState(user?.active   ?? true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const fd = new FormData();
    fd.set("name",     name);
    fd.set("email",    email);
    fd.set("password", password);
    fd.set("role",     role);
    fd.set("active",   String(active));

    startTransition(async () => {
      try {
        if (editing) {
          await updateUser(user!.id, fd);
        } else {
          await createUser(fd);
        }
        router.refresh();
        onClose();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  const inputBase = "rounded-lg px-3 py-2.5 text-sm outline-none transition-all w-full";
  const inputStyle = { background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" };

  return (
    <div
      className="fixed inset-0 z-200 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl flex flex-col max-h-[90vh]"
        style={{ background: "var(--bg-raised)", border: "1px solid var(--border-light)", boxShadow: "var(--shadow-lg)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: "var(--border)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            {editing ? "Edit User" : "Invite User"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-overlay)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6 overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2.5 rounded-lg px-4 py-3 text-sm"
              style={{ background: "rgba(255,77,106,0.1)", border: "1px solid rgba(255,77,106,0.2)", color: "var(--danger)" }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>
              Name <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <input
              required value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className={inputBase} style={inputStyle}
              onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--primary)"; }}
              onBlur={(e)  => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>
              Email <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              disabled={editing}
              className={inputBase}
              style={{ ...inputStyle, opacity: editing ? 0.5 : 1, cursor: editing ? "not-allowed" : "text" }}
              onFocus={(e) => { if (!editing) (e.target as HTMLInputElement).style.borderColor = "var(--primary)"; }}
              onBlur={(e)  => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>
              Password {editing ? <span style={{ color: "var(--text-muted)" }}>(leave blank to keep current)</span> : <span style={{ color: "var(--danger)" }}>*</span>}
            </label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder={editing ? "••••••••" : "Min 6 characters"}
              required={!editing}
              className={inputBase} style={inputStyle}
              onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--primary)"; }}
              onBlur={(e)  => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
            />
          </div>

          {/* Role */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>Role</label>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map(({ value, label, desc, icon: Icon, color }) => (
                <button
                  key={value}
                  type="button"
                  disabled={isSelf && value !== role}
                  onClick={() => setRole(value)}
                  className="flex flex-col items-start gap-0.5 rounded-lg px-3 py-2.5 text-left transition-all disabled:opacity-40"
                  style={{
                    background: role === value ? `${color}18` : "var(--bg-surface)",
                    border:     `1px solid ${role === value ? color : "var(--border)"}`,
                  }}
                >
                  <Icon size={13} style={{ color: role === value ? color : "var(--text-muted)" }} />
                  <span className="text-xs font-semibold mt-1" style={{ color: role === value ? color : "var(--text)" }}>
                    {label}
                  </span>
                  <span className="text-[10px] leading-tight" style={{ color: "var(--text-muted)" }}>{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Active toggle (edit only) */}
          {editing && !isSelf && (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--text)" }}>Active</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Inactive users cannot log in</p>
              </div>
              <button
                type="button"
                onClick={() => setActive(!active)}
                className="relative flex-shrink-0 w-10 h-5 rounded-full transition-all duration-200"
                style={{ background: active ? "var(--primary)" : "var(--border-light)" }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200"
                  style={{ background: "#fff", left: active ? "calc(100% - 18px)" : "2px", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}
                />
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg py-2.5 text-sm font-medium"
              style={{ background: "var(--bg-overlay)", color: "var(--text-soft)", border: "1px solid var(--border)" }}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50"
              style={{ background: "var(--primary)", color: "var(--text-inverse)" }}
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {isPending ? "Saving…" : editing ? "Save Changes" : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

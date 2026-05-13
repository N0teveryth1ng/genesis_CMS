"use client";

import { useState, useTransition } from "react";
import { Loader2, AlertCircle, CheckCircle2, Building2, User, Palette } from "lucide-react";
import { updateWorkspaceSettings, updateAccount } from "@/lib/actions/settings";
import { useUIStore } from "@/lib/stores/ui";

type Settings = {
  id: string; siteName: string; description: string; logoUrl: string; timezone: string;
};
type UserInfo = { id: string; name: string; email: string; role: string };

const TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Kolkata", "Asia/Tokyo",
  "Asia/Singapore", "Australia/Sydney",
];

const THEMES = [
  { value: "dark",  label: "Dark",  desc: "Deep navy — default Genesis look" },
  { value: "light", label: "Light", desc: "Clean white interface" },
];

/* ── Shared input style ──────────────────────────────────── */
function Input({
  label, name, type = "text", defaultValue = "", placeholder = "", required = false, disabled = false,
}: {
  label: string; name: string; type?: string;
  defaultValue?: string; placeholder?: string; required?: boolean; disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>
        {label} {required && <span style={{ color: "var(--danger)" }}>*</span>}
      </label>
      <input
        name={name} type={type} defaultValue={defaultValue}
        placeholder={placeholder} required={required} disabled={disabled}
        className="rounded-lg px-3 py-2.5 text-sm outline-none transition-all"
        style={{
          background: "var(--bg-surface)", border: "1px solid var(--border)",
          color: "var(--text)", opacity: disabled ? 0.5 : 1,
        }}
        onFocus={(e) => { if (!disabled) (e.target as HTMLInputElement).style.borderColor = "var(--primary)"; }}
        onBlur={(e)  => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
      />
    </div>
  );
}

/* ── Status banner ───────────────────────────────────────── */
function StatusBanner({ type, msg }: { type: "success" | "error"; msg: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg px-4 py-3 text-sm"
      style={{
        background: type === "success" ? "rgba(0,214,143,0.1)" : "rgba(255,77,106,0.1)",
        border:     `1px solid ${type === "success" ? "rgba(0,214,143,0.2)" : "rgba(255,77,106,0.2)"}`,
        color:      type === "success" ? "var(--success)" : "var(--danger)",
      }}>
      {type === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
      {msg}
    </div>
  );
}

/* ── Workspace tab ───────────────────────────────────────── */
function WorkspaceTab({ settings, isAdmin }: { settings: Settings; isAdmin: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await updateWorkspaceSettings(fd);
        setStatus({ type: "success", msg: "Workspace settings saved." });
      } catch (err: unknown) {
        setStatus({ type: "error", msg: err instanceof Error ? err.message : "Save failed" });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {status && <StatusBanner type={status.type} msg={status.msg} />}
      <Input label="Site Name"    name="siteName"    defaultValue={settings.siteName}    required disabled={!isAdmin} />
      <Input label="Description"  name="description" defaultValue={settings.description} placeholder="Short description of your workspace" disabled={!isAdmin} />
      <Input label="Logo URL"     name="logoUrl"     defaultValue={settings.logoUrl}     placeholder="https://example.com/logo.png" disabled={!isAdmin} />

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" style={{ color: "var(--text-soft)" }}>Timezone</label>
        <select
          name="timezone"
          defaultValue={settings.timezone}
          disabled={!isAdmin}
          className="rounded-lg px-3 py-2.5 text-sm outline-none"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)", opacity: isAdmin ? 1 : 0.5 }}
        >
          {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
        </select>
      </div>

      {isAdmin && (
        <div className="flex justify-end pt-2">
          <button
            type="submit" disabled={isPending}
            className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
            style={{ background: "var(--primary)", color: "var(--text-inverse)" }}
          >
            {isPending && <Loader2 size={14} className="animate-spin" />}
            {isPending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      )}

      {!isAdmin && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Only admins can edit workspace settings.
        </p>
      )}
    </form>
  );
}

/* ── Account tab ─────────────────────────────────────────── */
function AccountTab({ user }: { user: UserInfo }) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await updateAccount(user.id, fd);
        setStatus({ type: "success", msg: "Account updated. Changes take effect on next login." });
      } catch (err: unknown) {
        setStatus({ type: "error", msg: err instanceof Error ? err.message : "Update failed" });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {status && <StatusBanner type={status.type} msg={status.msg} />}

      <Input label="Display Name" name="name"  defaultValue={user.name}  required />
      <Input label="Email"        name="email" defaultValue={user.email} disabled />

      <div className="border-t pt-4 flex flex-col gap-4" style={{ borderColor: "var(--border)" }}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Change Password
        </p>
        <Input label="Current Password" name="curPassword" type="password" placeholder="••••••••" />
        <Input label="New Password"     name="newPassword" type="password" placeholder="Min 6 characters" />
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit" disabled={isPending}
          className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
          style={{ background: "var(--primary)", color: "var(--text-inverse)" }}
        >
          {isPending && <Loader2 size={14} className="animate-spin" />}
          {isPending ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

/* ── Appearance tab ──────────────────────────────────────── */
function AppearanceTab() {
  const { theme, toggleTheme } = useUIStore();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-medium mb-1" style={{ color: "var(--text)" }}>Theme</p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Choose how the dashboard looks. Saved locally in your browser.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {THEMES.map(({ value, label, desc }) => (
          <button
            key={value}
            type="button"
            onClick={() => { if (theme !== value) toggleTheme(); }}
            className="flex flex-col items-start gap-1 rounded-xl p-4 text-left transition-all"
            style={{
              background: theme === value ? "var(--primary-dim)" : "var(--bg-surface)",
              border:     `2px solid ${theme === value ? "var(--primary)" : "var(--border)"}`,
            }}
          >
            {/* Mini preview */}
            <div className="w-full h-12 rounded-lg mb-2 overflow-hidden flex"
              style={{ background: value === "dark" ? "#07091A" : "#F4F5F7", border: "1px solid var(--border)" }}>
              <div className="w-8 h-full" style={{ background: value === "dark" ? "#0D1025" : "#E8E9ED" }} />
              <div className="flex-1 p-1.5 flex flex-col gap-1">
                <div className="h-1.5 w-3/4 rounded-full" style={{ background: value === "dark" ? "#1E2235" : "#D1D5DB" }} />
                <div className="h-1.5 w-1/2 rounded-full" style={{ background: value === "dark" ? "#1E2235" : "#D1D5DB" }} />
              </div>
            </div>
            <span className="text-sm font-semibold" style={{ color: theme === value ? "var(--primary)" : "var(--text)" }}>
              {label}
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────── */
const TABS = [
  { id: "workspace",  label: "Workspace", icon: Building2 },
  { id: "account",    label: "Account",   icon: User      },
  { id: "appearance", label: "Appearance",icon: Palette   },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function SettingsClient({
  settings,
  user,
}: {
  settings: Settings;
  user: UserInfo;
}) {
  const [tab, setTab] = useState<TabId>("workspace");
  const isAdmin = user.role === "admin";

  return (
    <div className="p-6 max-w-2xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Settings</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          Manage your workspace and account preferences.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1 rounded-xl"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex items-center gap-2 flex-1 justify-center rounded-lg px-4 py-2 text-sm font-medium transition-all"
            style={{
              background: tab === id ? "var(--bg-raised)" : "transparent",
              color:      tab === id ? "var(--text)"      : "var(--text-muted)",
              boxShadow:  tab === id ? "var(--shadow-sm)" : "none",
            }}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="rounded-xl p-6"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        {tab === "workspace"  && <WorkspaceTab  settings={settings} isAdmin={isAdmin} />}
        {tab === "account"    && <AccountTab    user={user} />}
        {tab === "appearance" && <AppearanceTab />}
      </div>
    </div>
  );
}

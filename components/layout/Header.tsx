"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import {
  Search, Bell, ChevronRight, User, LogOut,
  Settings, ChevronsUpDown, Menu, Sun, Moon, Command,
  Check, Info, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/stores/ui";

/* ── Breadcrumbs ───────────────────────────────────────────── */
const LABEL_MAP: Record<string, string> = {
  collections: "Collections", files: "Files",      flows: "Flows",
  insights:    "Insights",    users: "Users",       roles: "Roles",
  "api-keys":  "API Keys",    webhooks: "Webhooks", settings: "Settings",
};

function Breadcrumbs() {
  const pathname  = usePathname();
  const segments  = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return <h1 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Overview</h1>;
  }

  return (
    <nav className="flex items-center gap-1 text-sm" aria-label="breadcrumb">
      <Link href="/" className="hover:underline" style={{ color: "var(--text-muted)" }}>
        Genesis
      </Link>
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        const href   = "/" + segments.slice(0, i + 1).join("/");
        const label  = LABEL_MAP[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1);
        return (
          <span key={seg} className="flex items-center gap-1">
            <ChevronRight size={12} style={{ color: "var(--text-muted)" }} />
            {isLast ? (
              <span className="font-semibold" style={{ color: "var(--text)" }}>{label}</span>
            ) : (
              <Link href={href} className="hover:underline" style={{ color: "var(--text-soft)" }}>
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

/* ── SearchBar (opens cmd palette) ────────────────────────────── */
function SearchBar() {
  const openCmd = useUIStore((s) => s.openCmd);
  return (
    <button
      onClick={openCmd}
      className="hidden sm:flex items-center gap-2 rounded-lg px-3 py-2 w-52 transition-all duration-150"
      style={{
        background: "var(--bg-raised)",
        border:     "1px solid var(--border)",
        color:      "var(--text-muted)",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-light)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; }}
    >
      <Search size={13} />
      <span className="text-sm flex-1 text-left">Search…</span>
      <span
        className="flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded"
        style={{ background: "var(--border)", color: "var(--text-muted)" }}
      >
        <Command size={9} />K
      </span>
    </button>
  );
}

/* ── Theme toggle ──────────────────────────────────────────── */
function ThemeToggle() {
  const { theme, toggleTheme } = useUIStore();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <button
      onClick={toggleTheme}
      className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150"
      style={{
        background: "var(--bg-raised)",
        border:     "1px solid var(--border)",
        color:      "var(--text-soft)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-light)";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--text)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--text-soft)";
      }}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}

/* ── Mock notifications ────────────────────────────────────── */
const NOTIFS = [
  { id: 1, icon: Check,         color: "var(--success)", title: "Migration completed",      time: "2m ago",  read: false },
  { id: 2, icon: Info,          color: "var(--info)",    title: "New user registered",      time: "1h ago",  read: false },
  { id: 3, icon: AlertTriangle, color: "var(--warning)", title: "Flow execution skipped",   time: "3h ago",  read: true  },
];

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const unread = NOTIFS.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150"
        style={{
          background: open ? "var(--bg-overlay)" : "var(--bg-raised)",
          border:     `1px solid ${open ? "var(--border-light)" : "var(--border)"}`,
          color:      "var(--text-soft)",
        }}
        aria-label="Notifications"
      >
        <Bell size={15} />
        {unread > 0 && (
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
            style={{ background: "var(--primary)", boxShadow: "0 0 6px var(--primary)" }}
          />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-190" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-2 z-200 w-80 rounded-xl overflow-hidden shadow-2xl animate-fade-in"
            style={{ background: "var(--bg-raised)", border: "1px solid var(--border-light)" }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: "var(--border)" }}>
              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                Notifications
              </p>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: "var(--primary-dim)", color: "var(--primary)" }}
              >
                {unread} new
              </span>
            </div>

            <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
              {NOTIFS.map(({ id, icon: Icon, color, title, time, read }) => (
                <div
                  key={id}
                  className={cn("flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors")}
                  style={{
                    background: read ? "transparent" : "var(--primary-muted)",
                    color: "var(--text-soft)",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--bg-overlay)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = read ? "transparent" : "var(--primary-muted)"; }}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: `${color}18`, color }}>
                    <Icon size={13} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: "var(--text)" }}>{title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{time}</p>
                  </div>
                  {!read && (
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                      style={{ background: "var(--primary)" }} />
                  )}
                </div>
              ))}
            </div>

            <div className="px-4 py-2.5 border-t text-center" style={{ borderColor: "var(--border)" }}>
              <button className="text-xs font-medium" style={{ color: "var(--primary)" }}>
                Mark all as read
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── User menu ─────────────────────────────────────────────── */
function UserMenu() {
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();

  const name     = session?.user?.name  ?? "Guest";
  const role     = session?.user?.role  ?? "viewer";
  const email    = session?.user?.email ?? "";
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const roleLabel = role === "admin" ? "Administrator" : role === "editor" ? "Editor" : "Viewer";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-all duration-150"
        style={{
          background: open ? "var(--bg-overlay)" : "var(--bg-raised)",
          border:     `1px solid ${open ? "var(--border-light)" : "var(--border)"}`,
        }}
      >
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0"
          style={{ background: "linear-gradient(135deg,#00C8F8,#7B61FF)", color: "#fff" }}
        >
          {initials}
        </div>
        <div className="hidden sm:flex flex-col items-start leading-tight">
          <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>{name}</span>
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{roleLabel}</span>
        </div>
        <ChevronsUpDown size={13} style={{ color: "var(--text-muted)" }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-190" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-2 z-200 w-52 rounded-xl py-1 shadow-2xl animate-fade-in"
            style={{ background: "var(--bg-raised)", border: "1px solid var(--border-light)" }}
          >
            <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
              <p className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>{name}</p>
              <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>{email}</p>
            </div>

            {[
              { icon: User,     label: "Profile",  href: "#"         },
              { icon: Settings, label: "Settings", href: "/settings" },
            ].map(({ icon: Icon, label, href }) => (
              <Link
                key={label}
                href={href}
                className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                style={{ color: "var(--text-soft)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = "var(--bg-overlay)";
                  (e.currentTarget as HTMLAnchorElement).style.color = "var(--text)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                  (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-soft)";
                }}
                onClick={() => setOpen(false)}
              >
                <Icon size={14} /> {label}
              </Link>
            ))}

            <div className="my-1 mx-3" style={{ height: "1px", background: "var(--border)" }} />

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors"
              style={{ color: "var(--danger)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,77,106,0.08)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Header ────────────────────────────────────────────────── */
export default function Header() {
  const openMobileSidebar = useUIStore((s) => s.openMobileSidebar);
  const openCmd           = useUIStore((s) => s.openCmd);

  /* ⌘K global shortcut */
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        openCmd();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openCmd]);

  return (
    <header
      className="flex items-center justify-between px-4 sm:px-6 h-14 shrink-0"
      style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" }}
    >
      {/* Left: mobile hamburger + breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={openMobileSidebar}
          className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: "var(--bg-raised)",
            border:     "1px solid var(--border)",
            color:      "var(--text-soft)",
          }}
          aria-label="Open menu"
        >
          <Menu size={17} />
        </button>
        <Breadcrumbs />
      </div>

      {/* Right */}
      <div className="flex items-center gap-2.5">
        <SearchBar />
        <ThemeToggle />
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}

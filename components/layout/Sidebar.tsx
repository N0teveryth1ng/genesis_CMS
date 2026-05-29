"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid, Database, FolderOpen, Users, Settings,
  Zap, BarChart2, ChevronLeft, ChevronRight, Globe,
  Shield, Key, HelpCircle, X, ClipboardList, LayoutTemplate, PackageOpen, Braces,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/stores/ui";

/* ── Nav data ──────────────────────────────────────────────── */
const NAV_MAIN = [
  { label: "Overview",       href: "/",            icon: LayoutGrid    },
  { label: "Collections",    href: "/collections", icon: Database      },
  { label: "Pages",          href: "/pages",       icon: LayoutTemplate },
  { label: "Files",          href: "/files",       icon: FolderOpen    },
  { label: "Live Preview",   href: "/preview",     icon: Globe         },
  { label: "Migration Kit",  href: "/migrate",     icon: PackageOpen   },
  { label: "GraphQL",        href: "/graphql",     icon: Braces        },
  { label: "Flows",          href: "/flows",       icon: Zap           },
  { label: "Insights",       href: "/insights",    icon: BarChart2     },
];

const NAV_SYSTEM = [
  { label: "Users",     href: "/users",    icon: Users         },
  { label: "Roles",     href: "/roles",    icon: Shield        },
  { label: "API Keys",  href: "/api-keys", icon: Key           },
  { label: "Webhooks",  href: "/webhooks", icon: Globe         },
  { label: "Audit Log", href: "/audit",    icon: ClipboardList },
  { label: "Settings",  href: "/settings", icon: Settings      },
];

/* ── Logo ──────────────────────────────────────────────────── */
function Logo({ collapsed }: { collapsed: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3 px-4 py-5 select-none">
      <div
        className="relative shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #00C8F8 0%, #7B61FF 100%)",
          boxShadow: "0 0 16px rgba(0,200,248,0.4)",
        }}
      >
        <span className="text-white font-black text-sm">G</span>
      </div>
      {!collapsed && (
        <div className="flex flex-col leading-tight overflow-hidden">
          <span className="text-gradient font-bold text-base whitespace-nowrap">Genesis</span>
          <span className="text-[10px] font-semibold tracking-widest uppercase whitespace-nowrap"
            style={{ color: "var(--text-muted)" }}>CMS</span>
        </div>
      )}
    </Link>
  );
}

/* ── NavItem ───────────────────────────────────────────────── */
function NavItem({
  href, icon: Icon, label, collapsed, active,
}: {
  href: string; icon: React.ElementType; label: string;
  collapsed: boolean; active: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
        collapsed && "justify-center px-2",
      )}
      style={{
        color:      active ? "var(--primary)" : "var(--text-soft)",
        background: active ? "var(--primary-dim)" : "transparent",
        boxShadow:  active ? "inset 2px 0 0 var(--primary)" : "none",
      }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLAnchorElement).style.background = "var(--bg-overlay)";
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
      }}
    >
      <Icon size={17} className="shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
      {collapsed && active && (
        <span className="absolute right-1 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full"
          style={{ background: "var(--primary)" }} />
      )}
    </Link>
  );
}

/* ── NavSection ─────────────────────────────────────────────── */
function NavSection({
  title, items, collapsed, pathname,
}: {
  title: string; items: typeof NAV_MAIN; collapsed: boolean; pathname: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {!collapsed && (
        <p className="px-3 pb-1 pt-0.5 text-[10px] font-semibold tracking-widest uppercase"
          style={{ color: "var(--text-muted)" }}>{title}</p>
      )}
      {items.map((item) => (
        <NavItem
          key={item.href}
          {...item}
          collapsed={collapsed}
          active={item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)}
        />
      ))}
    </div>
  );
}

/* ── Sidebar inner content ──────────────────────────────────── */
function SidebarContent({
  collapsed,
  onClose,
}: {
  collapsed: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div
      className="flex flex-col h-full"
      style={{
        background:  "var(--bg-surface)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Logo row + mobile close */}
      <div className="flex items-center justify-between pr-2">
        <Logo collapsed={collapsed} />
        {onClose && (
          <button onClick={onClose} className="p-2 rounded-lg lg:hidden"
            style={{ color: "var(--text-muted)" }}>
            <X size={18} />
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="mx-4 mb-3" style={{ height: "1px", background: "var(--border)" }} />

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-5 px-2 overflow-y-auto pb-4">
        <NavSection title="Content" items={NAV_MAIN}   collapsed={collapsed} pathname={pathname} />
        <NavSection title="System"  items={NAV_SYSTEM} collapsed={collapsed} pathname={pathname} />
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-3 border-t" style={{ borderColor: "var(--border)" }}>
          <a href="#" className="flex items-center gap-2 text-xs rounded-md px-2 py-1.5"
            style={{ color: "var(--text-muted)" }}>
            <HelpCircle size={13} /> Documentation
          </a>
          <p className="px-2 mt-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
            Genesis CMS v0.1.0
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Sidebar (desktop + mobile) ─────────────────────────────── */
export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, sidebarMobileOpen, closeMobileSidebar } = useUIStore();

  return (
    <>
      {/* ── Desktop sidebar ──────────────────────────────────── */}
      <aside
        className="relative hidden lg:flex flex-col shrink-0 transition-all duration-200"
        style={{ width: sidebarCollapsed ? "64px" : "220px" }}
      >
        <SidebarContent collapsed={sidebarCollapsed} />

        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-18 z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all hover:scale-110"
          style={{
            background:  "var(--bg-raised)",
            border:      "1px solid var(--border-light)",
            color:       "var(--text-soft)",
            boxShadow:   "var(--shadow)",
          }}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* ── Mobile drawer ────────────────────────────────────── */}
      {sidebarMobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 lg:hidden"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)" }}
            onClick={closeMobileSidebar}
          />
          {/* Drawer */}
          <div
            className="fixed left-0 top-0 bottom-0 z-50 w-55 animate-slide-in lg:hidden"
          >
            <SidebarContent collapsed={false} onClose={closeMobileSidebar} />
          </div>
        </>
      )}
    </>
  );
}

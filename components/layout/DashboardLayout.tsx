"use client";

import { useEffect } from "react";
import Sidebar          from "./Sidebar";
import Header           from "./Header";
import CommandPalette   from "./CommandPalette";
import RealtimeProvider from "@/components/realtime/RealtimeProvider";
import { useUIStore }   from "@/lib/stores/ui";

type Workspace = { id: string; name: string; plan: string };

export default function DashboardLayout({ children, workspaces = [] }: { children: React.ReactNode; workspaces?: Workspace[] }) {
  const theme = useUIStore((s) => s.theme);

  /* Apply saved theme on mount */
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <RealtimeProvider>
      <div className="flex h-full min-h-screen overflow-hidden">
        <Sidebar workspaces={workspaces} />

        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Header />

          <main
            className="flex-1 overflow-y-auto"
            style={{ background: "var(--bg-base)" }}
          >
            {children}
          </main>
        </div>

        <CommandPalette />
      </div>
    </RealtimeProvider>
  );
}

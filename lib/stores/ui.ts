"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIStore {
  /* Sidebar */
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;
  toggleSidebar:     () => void;
  openMobileSidebar: () => void;
  closeMobileSidebar:() => void;

  /* Theme */
  theme: "dark" | "light";
  toggleTheme: () => void;

  /* Command palette */
  cmdOpen: boolean;
  openCmd:  () => void;
  closeCmd: () => void;

  /* Real-time connection */
  liveStatus: "connecting" | "connected" | "disconnected";
  setLiveStatus: (s: "connecting" | "connected" | "disconnected") => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarCollapsed:   false,
      sidebarMobileOpen:  false,
      toggleSidebar:      () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      openMobileSidebar:  () => set({ sidebarMobileOpen: true  }),
      closeMobileSidebar: () => set({ sidebarMobileOpen: false }),

      theme:       "dark",
      toggleTheme: () =>
        set((s) => {
          const next = s.theme === "dark" ? "light" : "dark";
          if (typeof document !== "undefined") {
            document.documentElement.setAttribute("data-theme", next);
          }
          return { theme: next };
        }),

      cmdOpen:  false,
      openCmd:  () => set({ cmdOpen: true  }),
      closeCmd: () => set({ cmdOpen: false }),

      liveStatus:    "connecting",
      setLiveStatus: (s) => set({ liveStatus: s }),
    }),
    {
      name:    "genesis-ui",
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        theme:            s.theme,
      }),
    }
  )
);

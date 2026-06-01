"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[DashboardError]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-5 p-8">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{ background: "rgba(255,77,106,0.12)", color: "var(--danger)" }}>
        <AlertTriangle size={22} />
      </div>
      <div className="text-center">
        <p className="text-base font-semibold" style={{ color: "var(--text)" }}>Something went wrong</p>
        <p className="text-sm mt-1 max-w-xs" style={{ color: "var(--text-muted)" }}>
          {error.message || "An unexpected error occurred in this section."}
        </p>
        {error.digest && (
          <p className="text-[11px] font-mono mt-2" style={{ color: "var(--text-muted)" }}>
            ID: {error.digest}
          </p>
        )}
      </div>
      <button
        onClick={reset}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
        style={{ background: "var(--primary)", color: "#fff" }}>
        <RefreshCw size={13} /> Try again
      </button>
    </div>
  );
}

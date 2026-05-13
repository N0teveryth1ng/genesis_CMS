import type { Metadata } from "next";
import { Zap } from "lucide-react";

export const metadata: Metadata = { title: "Flows" };

export default function FlowsPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Flows</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          Automate tasks with trigger-based workflows.
        </p>
      </div>

      <div
        className="flex flex-col items-center justify-center py-24 rounded-xl gap-4"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(255,184,0,0.12)", color: "#FFB800" }}
        >
          <Zap size={26} />
        </div>
        <p className="text-base font-semibold" style={{ color: "var(--text)" }}>Coming soon</p>
        <p className="text-sm text-center max-w-sm" style={{ color: "var(--text-muted)" }}>
          Build automated workflows triggered by data events, schedules, or manual actions.
        </p>
      </div>
    </div>
  );
}

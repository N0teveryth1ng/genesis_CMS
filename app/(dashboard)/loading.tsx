export default function DashboardLoading() {
  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col gap-8 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-36 rounded-lg" style={{ background: "var(--bg-raised)" }} />
          <div className="h-4 w-56 rounded-lg" style={{ background: "var(--bg-raised)" }} />
        </div>
        <div className="h-9 w-36 rounded-lg" style={{ background: "var(--bg-raised)" }} />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl p-5 flex items-center justify-between"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <div className="flex flex-col gap-2">
              <div className="h-3 w-20 rounded" style={{ background: "var(--bg-raised)" }} />
              <div className="h-7 w-10 rounded" style={{ background: "var(--bg-raised)" }} />
            </div>
            <div className="w-10 h-10 rounded-xl" style={{ background: "var(--bg-raised)" }} />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="w-7 h-7 rounded-lg" style={{ background: "var(--bg-raised)" }} />
            <div className="flex-1 flex flex-col gap-2">
              <div className="h-3.5 w-48 rounded" style={{ background: "var(--bg-raised)" }} />
              <div className="h-3 w-32 rounded" style={{ background: "var(--bg-raised)" }} />
            </div>
            <div className="h-3 w-16 rounded" style={{ background: "var(--bg-raised)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

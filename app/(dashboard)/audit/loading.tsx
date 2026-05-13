export default function AuditLoading() {
  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col gap-6 animate-pulse">
      <div className="flex flex-col gap-1">
        <div className="h-7 w-32 rounded-lg" style={{ background: "var(--bg-raised)" }} />
        <div className="h-4 w-40 rounded-lg" style={{ background: "var(--bg-raised)" }} />
      </div>
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div className="px-5 py-2.5 border-b" style={{ background: "var(--bg-raised)", borderColor: "var(--border)" }}>
          <div className="h-3 w-20 rounded" style={{ background: "var(--bg-overlay)" }} />
        </div>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="w-8 h-8 rounded-lg shrink-0" style={{ background: "var(--bg-raised)" }} />
            <div className="flex-1 flex flex-col gap-2">
              <div className="h-3.5 w-64 rounded" style={{ background: "var(--bg-raised)" }} />
              <div className="h-3 w-36 rounded" style={{ background: "var(--bg-raised)" }} />
            </div>
            <div className="h-3 w-14 rounded" style={{ background: "var(--bg-raised)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

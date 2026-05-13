export default function CollectionsLoading() {
  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col gap-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-7 w-40 rounded-lg" style={{ background: "var(--bg-raised)" }} />
        <div className="h-9 w-36 rounded-lg" style={{ background: "var(--bg-raised)" }} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-xl p-5 flex flex-col gap-3"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg" style={{ background: "var(--bg-raised)" }} />
              <div className="flex flex-col gap-1.5">
                <div className="h-4 w-28 rounded" style={{ background: "var(--bg-raised)" }} />
                <div className="h-3 w-20 rounded" style={{ background: "var(--bg-raised)" }} />
              </div>
            </div>
            <div className="h-3 w-full rounded" style={{ background: "var(--bg-raised)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

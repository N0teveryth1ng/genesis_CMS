"use client";

import { FileText, Globe, Mail, HardDrive, Activity, Database, Plus, Edit2, Trash2 } from "lucide-react";

type TopPage = { id: string; title: string; slug: string; pageViews: number; status: string };
type SubmissionStat = { label: string; value: number };
type RecentLog = { id: string; action: string; resource: string; userEmail: string | null; createdAt: Date; meta: string | null };

interface InsightsData {
  totalPages: number;
  publishedPages: number;
  draftPages: number;
  totalSubmissions: number;
  totalFiles: number;
  totalStorage: number;
  totalEvents: number;
  topPages: TopPage[];
  submissionsByPage: SubmissionStat[];
  recentLogs: RecentLog[];
}

function formatBytes(b: number) {
  if (b < 1024)         return `${b} B`;
  if (b < 1024 ** 2)   return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 ** 2).toFixed(1)} MB`;
}

function timeAgo(date: Date) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/* ── Stat card ──────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, color = "var(--primary)" }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}18`, color }}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-2xl font-bold" style={{ color: "var(--text)" }}>{value}</p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
        {sub && <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{sub}</p>}
      </div>
    </div>
  );
}

/* ── Horizontal bar chart ───────────────────────────────── */
function BarChart({ data, color = "var(--primary)" }: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex flex-col gap-2.5">
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <div className="text-xs truncate text-right shrink-0" style={{ color: "var(--text-muted)", width: 120 }}>
            {item.label}
          </div>
          <div className="flex-1 h-5 rounded-md overflow-hidden" style={{ background: "var(--bg-raised)" }}>
            <div
              className="h-full rounded-md transition-all duration-700"
              style={{ width: `${Math.max(2, (item.value / max) * 100)}%`, background: color, opacity: 0.85 }}
            />
          </div>
          <div className="text-xs font-mono shrink-0" style={{ color: "var(--text)", width: 28, textAlign: "right" }}>
            {item.value}
          </div>
        </div>
      ))}
      {data.length === 0 && (
        <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>No data yet</p>
      )}
    </div>
  );
}

/* ── Section card ───────────────────────────────────────── */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-5 flex flex-col gap-4"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{title}</p>
      {children}
    </div>
  );
}

/* ── Activity log item ──────────────────────────────────── */
const ACTION_COLOR: Record<string, string> = {
  create: "var(--success)", update: "var(--info)", delete: "var(--danger)",
};
const ACTION_ICON: Record<string, React.ElementType> = {
  create: Plus, update: Edit2, delete: Trash2,
};

function LogRow({ log }: { log: RecentLog }) {
  const color = ACTION_COLOR[log.action] ?? "var(--info)";
  const Icon  = ACTION_ICON[log.action] ?? Edit2;
  let label = log.resource.replace("_", " ");
  try {
    const meta = JSON.parse(log.meta ?? "{}") as { label?: string; collectionName?: string; email?: string };
    if (meta.label ?? meta.collectionName ?? meta.email) label += `: "${meta.label ?? meta.collectionName ?? meta.email}"`;
  } catch { /* empty */ }
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
        style={{ background: `${color}18`, color }}>
        <Icon size={11} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs truncate capitalize" style={{ color: "var(--text)" }}>{log.action} {label}</p>
        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{log.userEmail ?? "system"}</p>
      </div>
      <p className="text-[11px] shrink-0" style={{ color: "var(--text-muted)" }}>{timeAgo(log.createdAt)}</p>
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────── */
export default function InsightsClient({ data }: { data: InsightsData }) {
  const topPagesData = data.topPages.map((p) => ({ label: p.title, value: p.pageViews }));

  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Insights</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          Real-time metrics for your content and platform.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Globe}    label="Published Pages"   value={data.publishedPages}   sub={`${data.draftPages} drafts`}          color="var(--success)" />
        <StatCard icon={Activity} label="Total Page Views"  value={data.topPages.reduce((s, p) => s + p.pageViews, 0)} color="var(--primary)" />
        <StatCard icon={Mail}     label="Form Submissions"  value={data.totalSubmissions}  color="var(--info)"    />
        <StatCard icon={HardDrive}label="Storage Used"      value={formatBytes(data.totalStorage)} sub={`${data.totalFiles} files`} color="#f59e0b" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Top Pages by Views">
          <BarChart data={topPagesData} color="var(--primary)" />
        </Card>
        <Card title="Submissions by Page">
          <BarChart data={data.submissionsByPage} color="var(--info)" />
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Collections */}
        <Card title="Content Overview">
          <div className="flex flex-col gap-3">
            {[
              { icon: FileText,  label: "Total Pages",      value: data.totalPages      },
              { icon: Database,  label: "Audit Events",     value: data.totalEvents     },
              { icon: Mail,      label: "Form Submissions", value: data.totalSubmissions },
              { icon: HardDrive, label: "Files Uploaded",   value: data.totalFiles      },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon size={13} style={{ color: "var(--text-muted)" }} />
                  <span className="text-xs" style={{ color: "var(--text-soft)" }}>{label}</span>
                </div>
                <span className="text-sm font-semibold font-mono" style={{ color: "var(--text)" }}>{value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent activity */}
        <div className="lg:col-span-2">
          <Card title="Recent Activity">
            <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
              {data.recentLogs.length === 0 ? (
                <p className="text-xs text-center py-6" style={{ color: "var(--text-muted)" }}>No activity yet</p>
              ) : data.recentLogs.map((log) => <LogRow key={log.id} log={log} />)}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

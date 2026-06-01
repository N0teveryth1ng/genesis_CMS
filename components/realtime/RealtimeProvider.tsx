"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/lib/stores/ui";
import { FileCheck, Globe, Mail } from "lucide-react";

type ToastKind = "page_saved" | "page_published" | "form_submitted";

interface Toast { id: string; kind: ToastKind; message: string }

const TOAST_CFG: Record<ToastKind, { icon: React.ElementType; color: string; label: string }> = {
  page_saved:     { icon: FileCheck, color: "var(--info)",    label: "Page saved"     },
  page_published: { icon: Globe,     color: "var(--success)", label: "Page published"  },
  form_submitted: { icon: Mail,      color: "var(--primary)", label: "New submission"  },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const cfg  = TOAST_CFG[toast.kind];
  const Icon = cfg.icon;

  useEffect(() => {
    const t = setTimeout(onDismiss, 4200);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      onClick={onDismiss}
      className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer shadow-2xl animate-slide-up"
      style={{ background: "var(--bg-raised)", border: "1px solid var(--border-light)", minWidth: 240, maxWidth: 320 }}
    >
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${cfg.color}20`, color: cfg.color }}>
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>{cfg.label}</p>
        <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>{toast.message}</p>
      </div>
    </div>
  );
}

export default function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const router        = useRouter();
  const setLiveStatus = useUIStore((s) => s.setLiveStatus);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev.slice(-2), { id, kind, message }]);
  }, []);

  const pop = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    let es: EventSource;
    let retryTimer: ReturnType<typeof setTimeout>;

    function connect() {
      setLiveStatus("connecting");
      es = new EventSource("/api/sse");

      es.addEventListener("connected", () => setLiveStatus("connected"));

      es.addEventListener("page_saved", (e: MessageEvent) => {
        try {
          const d = JSON.parse(e.data as string) as { title?: string };
          push("page_saved", d.title ?? "Untitled page");
          router.refresh();
        } catch { /* empty */ }
      });

      es.addEventListener("page_published", (e: MessageEvent) => {
        try {
          const d = JSON.parse(e.data as string) as { title?: string; status?: string };
          push("page_published", `"${d.title ?? "Page"}" → ${d.status}`);
          router.refresh();
        } catch { /* empty */ }
      });

      es.addEventListener("form_submitted", (e: MessageEvent) => {
        try {
          const d = JSON.parse(e.data as string) as { pageSlug?: string };
          push("form_submitted", `/${d.pageSlug ?? "page"}`);
        } catch { /* empty */ }
      });

      es.onerror = () => {
        setLiveStatus("disconnected");
        es.close();
        retryTimer = setTimeout(connect, 5000);
      };
    }

    connect();

    return () => {
      clearTimeout(retryTimer);
      es?.close();
      setLiveStatus("disconnected");
    };
  }, [router, setLiveStatus, push]);

  return (
    <>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col-reverse gap-2 items-end pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={() => pop(t.id)} />
          </div>
        ))}
      </div>
    </>
  );
}

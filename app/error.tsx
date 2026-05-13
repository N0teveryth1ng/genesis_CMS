"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6 p-6"
      style={{ background: "var(--bg-base)" }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #00C8F8 0%, #7B61FF 100%)",
          boxShadow: "0 0 32px rgba(0,200,248,0.3)",
        }}
      >
        <span className="text-white font-black text-2xl">G</span>
      </div>

      <div className="text-center">
        <p
          className="text-8xl font-black tracking-tight"
          style={{ color: "var(--danger)", opacity: 0.15 }}
        >
          500
        </p>
        <p className="text-xl font-bold -mt-6" style={{ color: "var(--text)" }}>
          Something went wrong
        </p>
        <p className="text-sm mt-2 max-w-xs text-center" style={{ color: "var(--text-muted)" }}>
          An unexpected error occurred. Try refreshing the page.
        </p>
        {error.digest && (
          <p className="text-[11px] font-mono mt-3" style={{ color: "var(--text-muted)" }}>
            Error ID: {error.digest}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="rounded-lg px-5 py-2.5 text-sm font-semibold"
          style={{ background: "var(--primary)", color: "var(--text-inverse)" }}
        >
          Try again
        </button>
        <a
          href="/"
          className="rounded-lg px-5 py-2.5 text-sm font-medium"
          style={{ background: "var(--bg-surface)", color: "var(--text)", border: "1px solid var(--border)" }}
        >
          Go home
        </a>
      </div>
    </div>
  );
}

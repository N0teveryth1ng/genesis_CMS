import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6 p-6"
      style={{ background: "var(--bg-base)" }}
    >
      {/* Logo mark */}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #00C8F8 0%, #7B61FF 100%)",
          boxShadow: "0 0 32px rgba(0,200,248,0.3)",
        }}
      >
        <span className="text-white font-black text-2xl">G</span>
      </div>

      {/* Code */}
      <div className="text-center">
        <p
          className="text-8xl font-black tracking-tight"
          style={{ color: "var(--primary)", opacity: 0.15 }}
        >
          404
        </p>
        <p className="text-xl font-bold -mt-6" style={{ color: "var(--text)" }}>
          Page not found
        </p>
        <p className="text-sm mt-2 max-w-xs text-center" style={{ color: "var(--text-muted)" }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>

      <Link
        href="/"
        className="rounded-lg px-5 py-2.5 text-sm font-semibold"
        style={{ background: "var(--primary)", color: "var(--text-inverse)" }}
      >
        Back to Overview
      </Link>
    </div>
  );
}

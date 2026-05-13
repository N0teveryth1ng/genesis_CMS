import type { Metadata } from "next";
import LoginForm from "./_components/LoginForm";

export const metadata: Metadata = { title: "Sign In" };

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--color-bg-base)" }}
    >
      {/* Background glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(0,200,248,0.06) 0%, transparent 70%)",
        }}
      />

      <div
        className="relative w-full max-w-sm rounded-2xl p-8"
        style={{
          background: "var(--color-bg-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-base"
            style={{
              background: "linear-gradient(135deg, #00C8F8 0%, #7B61FF 100%)",
              boxShadow: "0 0 20px rgba(0,200,248,0.35)",
            }}
          >
            G
          </div>
          <span className="text-gradient font-bold text-xl">Genesis CMS</span>
        </div>

        <h1
          className="text-xl font-semibold mb-1"
          style={{ color: "var(--color-text)" }}
        >
          Welcome back
        </h1>
        <p className="text-sm mb-7" style={{ color: "var(--color-text-soft)" }}>
          Sign in to your workspace
        </p>

        <LoginForm />
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";

export default function LoginForm() {
  const router = useRouter();

  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email:    email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password.");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Error banner */}
      {error && (
        <div
          className="flex items-center gap-2.5 rounded-lg px-4 py-3 text-sm"
          style={{
            background: "rgba(255,77,106,0.1)",
            border: "1px solid rgba(255,77,106,0.25)",
            color: "var(--color-danger)",
          }}
        >
          <AlertCircle size={15} className="flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="email"
          className="text-xs font-medium"
          style={{ color: "var(--color-text-soft)" }}
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="rounded-lg px-3 py-2.5 text-sm outline-none transition-all"
          style={{
            background: "var(--color-bg-raised)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text)",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--color-primary)")}
          onBlur={(e)  => (e.target.style.borderColor = "var(--color-border)")}
        />
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="password"
          className="text-xs font-medium"
          style={{ color: "var(--color-text-soft)" }}
        >
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPass ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-lg px-3 py-2.5 pr-10 text-sm outline-none transition-all"
            style={{
              background: "var(--color-bg-raised)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--color-primary)")}
            onBlur={(e)  => (e.target.style.borderColor = "var(--color-border)")}
          />
          <button
            type="button"
            onClick={() => setShowPass((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--color-text-muted)" }}
            tabIndex={-1}
          >
            {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="mt-2 flex items-center justify-center gap-2 w-full rounded-lg py-2.5 text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          background: loading ? "var(--color-primary-hover)" : "var(--color-primary)",
          color: "var(--color-text-inverse)",
        }}
      >
        {loading && <Loader2 size={15} className="animate-spin" />}
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

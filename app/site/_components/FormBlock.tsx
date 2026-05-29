"use client";

import { useState } from "react";

interface FormFieldConfig {
  id:       string;
  label:    string;
  type:     "text" | "email" | "tel" | "number" | "textarea";
  required: boolean;
}

export function FormBlock({
  data, pageId, pageSlug, blockId, style,
}: {
  data:      Record<string, string>;
  pageId:    string;
  pageSlug:  string;
  blockId:   string;
  style?:    { bg?: string; paddingY?: string };
}) {
  const [submitted, setSubmitted] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  let fields: FormFieldConfig[] = [];
  try { fields = JSON.parse(data.fields || "[]"); } catch { /* empty */ }

  const bgColor = style?.bg ?? data.bg ?? "#f8fafc";
  const padding = "72px 24px";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const body: Record<string, string> = {
      _pageId:   pageId,
      _pageSlug: pageSlug,
      _blockId:  blockId,
    };
    for (const [key, val] of fd.entries()) {
      body[key] = val as string;
    }

    try {
      const res = await fetch("/api/forms", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <section style={{ padding, background: bgColor, textAlign: "center" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#d1fae5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.75rem", margin: "0 auto 20px" }}>✓</div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827", marginBottom: 8, margin: "0 0 8px" }}>
            {data.successMsg || "Message received!"}
          </h2>
          <p style={{ color: "#6b7280", margin: 0 }}>We'll get back to you as soon as possible.</p>
        </div>
      </section>
    );
  }

  return (
    <section style={{ padding, background: bgColor }}>
      <div style={{ maxWidth: 540, margin: "0 auto" }}>
        {data.heading && (
          <h2 style={{ fontSize: "2rem", fontWeight: 700, color: "#111827", marginBottom: 32, textAlign: "center", margin: "0 0 32px" }}>
            {data.heading}
          </h2>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {fields.length === 0 ? (
            <p style={{ color: "#9ca3af", textAlign: "center" }}>No fields configured for this form.</p>
          ) : fields.map((field) => (
            <div key={field.id}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: 6 }}>
                {field.label}
                {field.required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  name={field.label.toLowerCase().replace(/\s+/g, "_")}
                  required={field.required}
                  rows={4}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: "0.9375rem", lineHeight: 1.5, resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                />
              ) : (
                <input
                  type={field.type}
                  name={field.label.toLowerCase().replace(/\s+/g, "_")}
                  required={field.required}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: "0.9375rem", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                />
              )}
            </div>
          ))}

          {error && <p style={{ color: "#ef4444", fontSize: "0.875rem", margin: 0 }}>{error}</p>}

          <button type="submit" disabled={loading}
            style={{ background: "#0ea5e9", color: "#fff", padding: "12px 32px", borderRadius: 8, fontWeight: 600, fontSize: "1rem", border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, fontFamily: "inherit" }}>
            {loading ? "Sending…" : (data.submitLabel || "Send Message")}
          </button>
        </form>
      </div>
    </section>
  );
}

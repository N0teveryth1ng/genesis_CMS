"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Check, GitBranch, Globe, ArrowRight, Code2, Package, Zap } from "lucide-react";
import type { ApiKey } from "@prisma/client";

type Framework = "nextjs" | "react" | "vue" | "html";

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all"
      style={{ background: "rgba(255,255,255,0.08)", color: copied ? "var(--success)" : "var(--text-muted)" }}>
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function CodeBlock({ code, language = "js" }: { code: string; language?: string }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="flex items-center justify-between px-4 py-2.5" style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="text-[11px] font-mono" style={{ color: "#7d8590" }}>{language}</span>
        <CopyBtn text={code} />
      </div>
      <pre className="p-4 text-[12px] font-mono overflow-x-auto leading-relaxed" style={{ color: "#e6edf3", margin: 0 }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center gap-1">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
          style={{ background: "var(--primary-dim)", color: "var(--primary)", border: "2px solid var(--primary)" }}>
          {n}
        </div>
        <div className="w-px flex-1 min-h-6" style={{ background: "var(--border)" }} />
      </div>
      <div className="flex-1 pb-8">
        <p className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>{title}</p>
        {children}
      </div>
    </div>
  );
}

const FRAMEWORKS: { id: Framework; label: string }[] = [
  { id: "nextjs", label: "Next.js" },
  { id: "react",  label: "React / Vite" },
  { id: "vue",    label: "Vue" },
  { id: "html",   label: "Plain HTML" },
];

function getSnippets(framework: Framework, apiUrl: string, apiKey: string) {
  const endpoint = `${apiUrl}/api/v1/site_content`;
  const bearer   = `Bearer ${apiKey}`;

  const helperFile = `// genesis.js — drop this in your project root
export async function getContent() {
  const res = await fetch("${endpoint}", {
    headers: { Authorization: "${bearer}" },
    next: { revalidate: 60 }, // cache 60s
  });
  const { data } = await res.json();
  return data[0] ?? {};
}`;

  const nextjs = `// app/layout.tsx (or any server component)
import { getContent } from "@/genesis";

export default async function HomePage() {
  const content = await getContent();

  return (
    <>
      {/* Navbar */}
      <nav>{content.nav_logo}</nav>

      {/* Hero */}
      <section>
        <h1>{content.hero_heading}</h1>
        <p>{content.hero_subtext}</p>
        <a href={content.hero_btn1_url}>{content.hero_btn1}</a>
      </section>

      {/* Footer */}
      <footer>{content.footer_copy}</footer>
    </>
  );
}`;

  const react = `// src/App.jsx
import { useEffect, useState } from "react";

function useGenesisContent() {
  const [content, setContent] = useState({});
  useEffect(() => {
    fetch("${endpoint}", {
      headers: { Authorization: "${bearer}" }
    })
    .then(r => r.json())
    .then(({ data }) => setContent(data[0] ?? {}));
  }, []);
  return content;
}

export default function App() {
  const content = useGenesisContent();
  return (
    <>
      <nav>{content.nav_logo}</nav>
      <h1>{content.hero_heading}</h1>
      <p>{content.hero_subtext}</p>
      <footer>{content.footer_copy}</footer>
    </>
  );
}`;

  const vue = `<!-- App.vue -->
<script setup>
import { ref, onMounted } from "vue";
const content = ref({});
onMounted(async () => {
  const { data } = await fetch("${endpoint}", {
    headers: { Authorization: "${bearer}" }
  }).then(r => r.json());
  content.value = data[0] ?? {};
});
</script>

<template>
  <nav>{{ content.nav_logo }}</nav>
  <h1>{{ content.hero_heading }}</h1>
  <p>{{ content.hero_subtext }}</p>
  <footer>{{ content.footer_copy }}</footer>
</template>`;

  const html = `<!DOCTYPE html>
<html>
<body>
  <nav id="nav-logo"></nav>
  <h1 id="hero-heading"></h1>
  <p id="hero-subtext"></p>
  <footer id="footer-copy"></footer>

  <script>
    fetch("${endpoint}", {
      headers: { Authorization: "${bearer}" }
    })
    .then(r => r.json())
    .then(({ data }) => {
      const c = data[0] ?? {};
      document.getElementById("nav-logo").textContent  = c.nav_logo;
      document.getElementById("hero-heading").textContent = c.hero_heading;
      document.getElementById("hero-subtext").textContent = c.hero_subtext;
      document.getElementById("footer-copy").textContent  = c.footer_copy;
    });
  </script>
</body>
</html>`;

  return { helperFile, usage: { nextjs, react, vue, html }[framework] };
}

export default function MigrateClient({ git, col, apiKeys }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  git: any; col: any; apiKeys: ApiKey[];
}) {
  const [framework, setFramework] = useState<Framework>("nextjs");
  const apiKey   = apiKeys[0]?.prefix ? `${apiKeys[0].prefix}••••••••••••` : "YOUR_API_KEY";
  const apiUrl   = typeof window !== "undefined" ? window.location.origin : "https://your-genesis-url.com";
  const snippets = getSnippets(framework, apiUrl, apiKey);

  const connected = !!git?.owner && !!git?.repo;

  return (
    <div className="p-6 max-w-3xl mx-auto flex flex-col gap-8">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Client Migration Kit</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Connect any existing website to Genesis CMS in under 10 minutes — no rebuild required.
        </p>
      </div>

      {/* Status */}
      <div className="rounded-xl p-4 flex items-center gap-4"
        style={{ background: connected ? "rgba(0,214,143,0.08)" : "var(--bg-surface)", border: `1px solid ${connected ? "rgba(0,214,143,0.25)" : "var(--border)"}` }}>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: connected ? "rgba(0,214,143,0.15)" : "var(--bg-raised)", color: connected ? "var(--success)" : "var(--text-muted)" }}>
          <GitBranch size={18} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            {connected ? `${git.owner}/${git.repo}` : "No repository connected"}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {connected ? `${git.branch} branch · Site Content collection ready` : "Connect a repo in Settings → GitHub Sync first"}
          </p>
        </div>
        {col && (
          <Link href="/collections/site_content/data"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
            <Globe size={12} /> Edit Content
          </Link>
        )}
      </div>

      {/* How it works */}
      <div className="rounded-xl p-5 flex flex-col gap-4"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>How it works</p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Globe,   title: "1. Edit in Genesis", desc: "Change hero text, navbar, footer from the Site Content collection" },
            { icon: Zap,     title: "2. API serves it",   desc: "Your content is instantly available via the Genesis REST API" },
            { icon: Code2,   title: "3. Site updates",    desc: "Your website fetches from Genesis on load — always fresh" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex flex-col gap-2 p-3 rounded-lg" style={{ background: "var(--bg-raised)" }}>
              <Icon size={16} style={{ color: "var(--primary)" }} />
              <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>{title}</p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Steps */}
      <div className="flex flex-col">
        <p className="text-sm font-semibold mb-6" style={{ color: "var(--text)" }}>Integration Steps</p>

        <Step n={1} title="Pick your framework">
          <div className="flex gap-2 flex-wrap">
            {FRAMEWORKS.map(({ id, label }) => (
              <button key={id} onClick={() => setFramework(id)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: framework === id ? "var(--primary)" : "var(--bg-raised)",
                  color:      framework === id ? "var(--text-inverse)" : "var(--text-soft)",
                  border:     `1px solid ${framework === id ? "var(--primary)" : "var(--border)"}`,
                }}>
                {label}
              </button>
            ))}
          </div>
        </Step>

        {framework === "nextjs" && (
          <Step n={2} title='Create genesis.js helper in your project root'>
            <CodeBlock code={snippets.helperFile} language="genesis.js" />
          </Step>
        )}

        <Step n={framework === "nextjs" ? 3 : 2} title="Replace hardcoded content with Genesis data">
          <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
            Find your hero/navbar/footer component and replace the hardcoded strings with values from Genesis:
          </p>
          <CodeBlock code={snippets.usage} language={framework === "html" ? "html" : framework === "vue" ? "vue" : "jsx"} />
        </Step>

        <Step n={framework === "nextjs" ? 4 : 3} title="Go to Site Content and fill in your content">
          <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
            Edit all your website&apos;s text, links, and images from one place — no code needed.
          </p>
          <Link href="/collections"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: "var(--primary)", color: "var(--text-inverse)" }}>
            Open Site Content <ArrowRight size={14} />
          </Link>
        </Step>
      </div>

      {/* API reference */}
      <div className="rounded-xl p-5 flex flex-col gap-3"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2">
          <Package size={14} style={{ color: "var(--primary)" }} />
          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Your API Endpoint</p>
        </div>
        <CodeBlock code={`GET ${apiUrl}/api/v1/site_content\nAuthorization: Bearer ${apiKey}`} language="http" />
        {apiKeys.length === 0 && (
          <p className="text-xs" style={{ color: "var(--danger)" }}>
            No API key yet. <a href="/api-keys" style={{ color: "var(--primary)" }}>Generate one →</a>
          </p>
        )}
      </div>
    </div>
  );
}

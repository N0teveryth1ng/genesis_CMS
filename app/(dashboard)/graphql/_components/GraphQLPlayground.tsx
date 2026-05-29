"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Loader2, Code2, ChevronDown, ChevronUp, Copy, Check, BookOpen } from "lucide-react";

const DEFAULT_QUERY = `# Welcome to Genesis GraphQL Explorer
# Replace "your_collection" with your actual collection name.

query ListRecords {
  your_collections(page: 1, limit: 10) {
    data {
      id
      createdAt
    }
    meta {
      total
      page
      pages
    }
  }
}
`;

const EXAMPLE_QUERIES = [
  {
    label: "List records (paginated)",
    query: `query ListRecords {
  your_collections(page: 1, limit: 20, sort: "-createdAt") {
    data {
      id
      createdAt
    }
    meta { total page pages limit }
  }
}`,
  },
  {
    label: "Get single record",
    query: `query GetRecord {
  your_collection(id: "RECORD_ID") {
    id
    createdAt
    updatedAt
  }
}`,
  },
  {
    label: "Create record",
    query: `mutation CreateRecord {
  create_your_collection(input: {
    # add your fields here
  }) {
    id
    createdAt
  }
}`,
  },
  {
    label: "Update record",
    query: `mutation UpdateRecord {
  update_your_collection(id: "RECORD_ID", input: {
    # fields to update
  }) {
    id
    updatedAt
  }
}`,
  },
  {
    label: "Delete record",
    query: `mutation DeleteRecord {
  delete_your_collection(id: "RECORD_ID")
}`,
  },
  {
    label: "Search + sort",
    query: `query SearchRecords {
  your_collections(
    page: 1
    limit: 50
    search: "keyword"
    sort: "fieldName"
  ) {
    data { id createdAt }
    meta { total }
  }
}`,
  },
];

export default function GraphQLPlayground() {
  const [query, setQuery]           = useState(DEFAULT_QUERY);
  const [variables, setVariables]   = useState("{}");
  const [apiKey, setApiKey]         = useState("");
  const [result, setResult]         = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [showVars, setShowVars]     = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [copied, setCopied]         = useState(false);
  const textareaRef                 = useRef<HTMLTextAreaElement>(null);

  // Auto-load API key from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("genesis_gql_apikey");
    if (stored) setApiKey(stored);
  }, []);

  function saveKey(k: string) {
    setApiKey(k);
    localStorage.setItem("genesis_gql_apikey", k);
  }

  async function runQuery() {
    setLoading(true);
    setError(null);
    setResult(null);

    let vars: Record<string, unknown> = {};
    try { vars = JSON.parse(variables); } catch {
      setError("Variables must be valid JSON.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/graphql", {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ query, variables: vars }),
      });

      const json = await res.json();
      setResult(JSON.stringify(json, null, 2));
      if (!res.ok || json.errors) {
        setError(json.errors?.[0]?.message ?? `HTTP ${res.status}`);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      runQuery();
    }
    // Tab → 2 spaces
    if (e.key === "Tab") {
      e.preventDefault();
      const el  = e.currentTarget;
      const s   = el.selectionStart;
      const end = el.selectionEnd;
      const val = el.value;
      el.value = val.slice(0, s) + "  " + val.slice(end);
      el.selectionStart = el.selectionEnd = s + 2;
      setQuery(el.value);
    }
  }

  function copyResult() {
    if (!result) return;
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 shrink-0"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-surface)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "var(--primary-dim)", color: "var(--primary)" }}
          >
            <Code2 size={18} />
          </div>
          <div>
            <h1 className="text-base font-bold" style={{ color: "var(--text)" }}>GraphQL Explorer</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Auto-generated from your collections · <code className="font-mono">/api/graphql</code>
            </p>
          </div>
        </div>

        {/* Examples button */}
        <button
          onClick={() => setShowExamples((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
          style={{ background: "var(--bg-raised)", color: "var(--text-soft)", border: "1px solid var(--border)" }}
        >
          <BookOpen size={14} /> Examples
          {showExamples ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {/* Examples drawer */}
      {showExamples && (
        <div
          className="px-6 py-3 flex gap-2 flex-wrap shrink-0"
          style={{ background: "var(--bg-raised)", borderBottom: "1px solid var(--border)" }}
        >
          {EXAMPLE_QUERIES.map((ex) => (
            <button
              key={ex.label}
              onClick={() => { setQuery(ex.query); setShowExamples(false); }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-soft)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--primary)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--primary)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-soft)"; }}
            >
              {ex.label}
            </button>
          ))}
        </div>
      )}

      {/* API Key bar */}
      <div
        className="flex items-center gap-3 px-6 py-2 shrink-0"
        style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" }}
      >
        <span className="text-xs font-semibold shrink-0" style={{ color: "var(--text-muted)" }}>API KEY</span>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => saveKey(e.target.value)}
          placeholder="sk-live-xxxxxxxxxxxxxxxx"
          className="flex-1 max-w-sm px-3 py-1.5 rounded-lg text-xs font-mono outline-none"
          style={{
            background: "var(--bg-raised)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        />
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          Saved locally · Ctrl+Enter to run
        </span>
      </div>

      {/* Main pane: editor left, result right */}
      <div className="flex flex-1 min-h-0">
        {/* Left: query + variables */}
        <div
          className="flex flex-col flex-1 min-w-0"
          style={{ borderRight: "1px solid var(--border)" }}
        >
          {/* Query editor */}
          <div className="flex items-center justify-between px-4 py-2 shrink-0"
            style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-raised)" }}>
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Query / Mutation
            </span>
            <button
              onClick={runQuery}
              disabled={loading || !apiKey}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 transition-all"
              style={{ background: "var(--primary)", color: "var(--text-inverse)" }}
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
              Run
            </button>
          </div>

          <textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            className="flex-1 resize-none p-4 font-mono text-sm outline-none"
            style={{
              background: "var(--bg)",
              color: "var(--text)",
              lineHeight: "1.6",
              tabSize: 2,
            }}
          />

          {/* Variables toggle */}
          <div style={{ borderTop: "1px solid var(--border)" }}>
            <button
              onClick={() => setShowVars((v) => !v)}
              className="flex items-center gap-2 w-full px-4 py-2 text-[11px] font-semibold uppercase tracking-wider"
              style={{ background: "var(--bg-raised)", color: "var(--text-muted)" }}
            >
              Variables
              {showVars ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {showVars && (
              <textarea
                value={variables}
                onChange={(e) => setVariables(e.target.value)}
                spellCheck={false}
                placeholder="{}"
                rows={4}
                className="w-full resize-none p-4 font-mono text-xs outline-none"
                style={{
                  background: "var(--bg-surface)",
                  color: "var(--text)",
                  borderTop: "1px solid var(--border)",
                }}
              />
            )}
          </div>
        </div>

        {/* Right: result */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center justify-between px-4 py-2 shrink-0"
            style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-raised)" }}>
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Response
            </span>
            {result && (
              <button
                onClick={copyResult}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded"
                style={{ color: "var(--text-muted)" }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy"}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-auto p-4">
            {!result && !error && !loading && (
              <p className="text-sm mt-8 text-center" style={{ color: "var(--text-muted)" }}>
                Run a query to see results here.
              </p>
            )}
            {loading && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Loader2 size={18} className="animate-spin" style={{ color: "var(--primary)" }} />
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>Running…</span>
              </div>
            )}
            {error && !result && (
              <div
                className="rounded-lg p-3 text-sm font-medium"
                style={{ background: "color-mix(in srgb, var(--danger) 12%, transparent)", color: "var(--danger)", border: "1px solid color-mix(in srgb, var(--danger) 30%, transparent)" }}
              >
                {error}
              </div>
            )}
            {result && (
              <pre
                className="font-mono text-xs leading-relaxed whitespace-pre-wrap break-all"
                style={{ color: "var(--text)" }}
              >
                {result}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

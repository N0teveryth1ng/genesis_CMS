"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Pencil, PencilOff, Trash2, RefreshCw, Info, MousePointer2 } from "lucide-react";

export default function RepoContentEditor({
  iframeRef,
  repoKey,
}: {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  repoKey:   string; // "owner/repo" — used as localStorage namespace
}) {
  const [editMode, setEditMode]   = useState(false);
  const [patches,  setPatches]    = useState<Record<string, string>>({});
  const patchesRef                = useRef<Record<string, string>>({});
  const editModeRef               = useRef(false);
  const storageKey                = `genesis_patches_${repoKey.replace(/[^a-z0-9]/gi, "_")}`;

  // Load saved patches when repoKey changes
  useEffect(() => {
    setEditMode(false);
    editModeRef.current = false;
    try {
      const stored = localStorage.getItem(storageKey);
      const loaded = stored ? JSON.parse(stored) : {};
      setPatches(loaded);
      patchesRef.current = loaded;
    } catch {
      setPatches({});
      patchesRef.current = {};
    }
  }, [repoKey, storageKey]);

  // Persist patches to localStorage on every change
  useEffect(() => {
    patchesRef.current = patches;
    try { localStorage.setItem(storageKey, JSON.stringify(patches)); } catch {}
  }, [patches, storageKey]);

  // Keep editModeRef in sync
  useEffect(() => { editModeRef.current = editMode; }, [editMode]);

  // Listen for messages from the iframe
  useEffect(() => {
    function handleMsg(ev: MessageEvent) {
      if (!ev.data || ev.data._g !== 1) return;

      if (ev.data.t === "textpatch") {
        const { original, value } = ev.data as { original: string; value: string };
        setPatches((p) => ({ ...p, [original]: value }));
      }

      if (ev.data.t === "ready") {
        // Send all saved patches + restore edit mode
        setTimeout(() => {
          try {
            iframeRef.current?.contentWindow?.postMessage(
              { _g: 1, t: "init", patches: patchesRef.current }, "*"
            );
            if (editModeRef.current) {
              iframeRef.current?.contentWindow?.postMessage(
                { _g: 1, t: "editmode", on: true }, "*"
              );
            }
          } catch {}
        }, 200);
      }
    }
    window.addEventListener("message", handleMsg);
    return () => window.removeEventListener("message", handleMsg);
  }, [iframeRef]);

  const sendEditMode = useCallback((on: boolean) => {
    try {
      iframeRef.current?.contentWindow?.postMessage({ _g: 1, t: "editmode", on }, "*");
    } catch {}
  }, [iframeRef]);

  function toggleEditMode() {
    const next = !editMode;
    setEditMode(next);
    editModeRef.current = next;
    sendEditMode(next);
  }

  function removePatch(original: string) {
    setPatches((p) => { const n = { ...p }; delete n[original]; return n; });
    // Reload iframe to restore original text
    setTimeout(() => {
      if (iframeRef.current) iframeRef.current.src = iframeRef.current.src;
    }, 50);
  }

  function clearAll() {
    setPatches({});
    patchesRef.current = {};
    if (iframeRef.current) iframeRef.current.src = iframeRef.current.src;
  }

  const patchCount = Object.keys(patches).length;

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <p className="text-xs font-bold" style={{ color: "var(--text)" }}>Visual Editor</p>
        <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
          {repoKey !== "unknown/unknown" ? repoKey : "No repo connected"}
        </p>
      </div>

      {/* Edit Mode Toggle */}
      <div className="px-4 pt-4 pb-3 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <button
          onClick={toggleEditMode}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl font-semibold text-sm transition-all"
          style={{
            background:  editMode ? "var(--primary)" : "var(--bg-raised)",
            color:       editMode ? "var(--text-inverse)" : "var(--text-soft)",
            border:      `2px solid ${editMode ? "var(--primary)" : "var(--border)"}`,
            boxShadow:   editMode ? "0 0 24px rgba(0,200,248,0.25)" : "none",
          }}>
          {editMode ? <Pencil size={15} /> : <PencilOff size={15} />}
          {editMode ? "Editing — Click any text" : "Enable Edit Mode"}
        </button>
        {editMode && (
          <p className="text-center text-[10px] mt-2 leading-relaxed"
            style={{ color: "var(--primary)" }}>
            <MousePointer2 size={10} className="inline mr-1" />
            Hover → highlight • Click → edit • Enter to save • Esc to cancel
          </p>
        )}
      </div>

      {/* Changes list */}
      <div className="flex-1 overflow-y-auto">
        {patchCount > 0 ? (
          <div className="flex flex-col p-4 gap-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}>
                Changes · {patchCount}
              </p>
              <button onClick={clearAll}
                className="text-[10px] font-semibold px-2 py-0.5 rounded"
                style={{ color: "var(--danger)", background: "rgba(255,77,106,0.08)" }}>
                Clear all
              </button>
            </div>

            {Object.entries(patches).map(([original, value]) => (
              <div key={original} className="rounded-lg p-2.5 group"
                style={{ background: "var(--bg-raised)", border: "1px solid var(--border)" }}>
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] line-through truncate mb-0.5"
                      style={{ color: "var(--text-muted)" }}>
                      {original.slice(0, 60)}{original.length > 60 ? "…" : ""}
                    </p>
                    <p className="text-[11px] font-medium truncate"
                      style={{ color: "var(--primary)" }}>
                      {value.slice(0, 60)}{value.length > 60 ? "…" : ""}
                    </p>
                  </div>
                  <button onClick={() => removePatch(original)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
                    style={{ color: "var(--danger)" }}>
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-10 px-6 text-center">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "var(--primary-dim)" }}>
              <Info size={18} style={{ color: "var(--primary)" }} />
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {editMode
                ? "Hover over any text in the preview and click to edit it."
                : "Enable Edit Mode then click any text in the preview to change it."}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 shrink-0 flex items-center justify-between"
        style={{ borderTop: "1px solid var(--border)" }}>
        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          Saved locally • switches with repo
        </p>
        <button
          onClick={() => { if (iframeRef.current) iframeRef.current.src = iframeRef.current.src; }}
          className="p-1.5 rounded-lg" title="Reload preview"
          style={{ background: "var(--bg-raised)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
          <RefreshCw size={11} />
        </button>
      </div>
    </div>
  );
}

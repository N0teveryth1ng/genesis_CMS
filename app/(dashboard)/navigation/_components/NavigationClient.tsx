"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, GripVertical, Save, Loader2, Check,
  X, ExternalLink, Link2, Globe,
} from "lucide-react";
import {
  createNavMenu, updateNavMenu, deleteNavMenu,
} from "@/lib/actions/navigation";

interface NavItem { id: string; label: string; href: string }
interface Menu    { id: string; name: string; items: string; createdAt: Date; updatedAt: Date }
interface Page    { id: string; title: string; slug: string }

function uid() { return Math.random().toString(36).slice(2, 9); }

/* ── Item row ────────────────────────────────────────────── */
function ItemRow({
  item, isDragging, isDragOver,
  onDragStart, onDragOver, onDragEnd, onDrop,
  onChange, onDelete,
}: {
  item:       NavItem;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart:() => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd:  () => void;
  onDrop:     () => void;
  onChange:   (patch: Partial<NavItem>) => void;
  onDelete:   () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
      className="flex items-center gap-2 p-2 rounded-lg"
      style={{
        border:     `1px solid ${isDragOver ? "var(--primary)" : "var(--border)"}`,
        background: isDragOver ? "var(--primary-dim)" : "var(--bg-raised)",
        opacity:    isDragging ? 0.4 : 1,
      }}
    >
      <div className="cursor-grab shrink-0" style={{ color: "var(--text-muted)" }}>
        <GripVertical size={14} />
      </div>
      <input
        value={item.label}
        onChange={(e) => onChange({ label: e.target.value })}
        placeholder="Label"
        className="flex-1 min-w-0 text-sm rounded-md px-2 py-1 outline-none"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
      />
      <input
        value={item.href}
        onChange={(e) => onChange({ href: e.target.value })}
        placeholder="URL or /site/page"
        className="flex-[2] min-w-0 text-sm rounded-md px-2 py-1 outline-none font-mono text-xs"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
      />
      <button onClick={onDelete} className="shrink-0" style={{ color: "var(--danger)" }}>
        <X size={13} />
      </button>
    </div>
  );
}

/* ── Menu editor ─────────────────────────────────────────── */
function MenuEditor({ menu, pages, onClose }: {
  menu:    Menu;
  pages:   Page[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [name,      setName]      = useState(menu.name);
  const [items,     setItems]     = useState<NavItem[]>(() => {
    try { return JSON.parse(menu.items); } catch { return []; }
  });
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [showPages, setShowPages] = useState(false);

  const dragIdx  = useRef(-1);
  const [dragOver, setDragOver] = useState(-1);

  function handleDrop(dropIdx: number) {
    const from = dragIdx.current;
    if (from === -1 || from === dropIdx) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(dropIdx, 0, moved);
    setItems(next);
    dragIdx.current = -1;
    setDragOver(-1);
  }

  function addPage(page: Page) {
    setItems((prev) => [...prev, { id: uid(), label: page.title, href: `/site/${page.slug}` }]);
    setShowPages(false);
  }

  function addCustom() {
    setItems((prev) => [...prev, { id: uid(), label: "New Link", href: "#" }]);
  }

  function updateItem(id: string, patch: Partial<NavItem>) {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, ...patch } : i));
  }

  async function save() {
    setSaving(true);
    await updateNavMenu(menu.id, { name, items: JSON.stringify(items) });
    setSaving(false);
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Menu name */}
      <div className="flex items-center gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 text-base font-semibold rounded-lg px-3 py-2 outline-none"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
          placeholder="Menu name"
        />
        <button onClick={onClose} className="p-2 rounded-lg" style={{ color: "var(--text-muted)", background: "var(--bg-raised)" }}>
          <X size={15} />
        </button>
      </div>

      {/* Items */}
      <div className="flex flex-col gap-2">
        {items.length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>
            No items yet. Add links below.
          </p>
        )}
        {/* eslint-disable-next-line react-hooks/refs */}
        {items.map((item, i) => (
          <ItemRow
            key={item.id}
            item={item}
            isDragging={dragIdx.current === i}
            isDragOver={dragOver === i}
            onDragStart={() => { dragIdx.current = i; }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(i); }}
            onDragEnd={() => { dragIdx.current = -1; setDragOver(-1); }}
            onDrop={() => handleDrop(i)}
            onChange={(patch) => updateItem(item.id, patch)}
            onDelete={() => setItems((prev) => prev.filter((_, j) => j !== i))}
          />
        ))}
      </div>

      {/* Add item controls */}
      <div className="flex gap-2 flex-wrap">
        {/* Add from pages */}
        <div className="relative">
          <button onClick={() => setShowPages((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium"
            style={{ background: "var(--primary-dim)", color: "var(--primary)", border: "1px solid transparent" }}>
            <Link2 size={11} /> Add Page Link
          </button>
          {showPages && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowPages(false)} />
              <div className="absolute top-full left-0 z-20 mt-1 rounded-xl overflow-hidden shadow-xl min-w-[200px]"
                style={{ background: "var(--bg-raised)", border: "1px solid var(--border)" }}>
                {pages.length === 0 ? (
                  <p className="text-xs px-4 py-3" style={{ color: "var(--text-muted)" }}>No published pages.</p>
                ) : pages.map((p) => (
                  <button key={p.id} onClick={() => addPage(p)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left"
                    style={{ color: "var(--text-soft)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-overlay)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}>
                    <Globe size={12} style={{ color: "var(--primary)" }} />
                    {p.title}
                    <span className="text-[10px] ml-auto" style={{ color: "var(--text-muted)" }}>/{p.slug}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button onClick={addCustom}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium"
          style={{ background: "var(--bg-raised)", color: "var(--text-soft)", border: "1px solid var(--border)" }}>
          <ExternalLink size={11} /> Add Custom Link
        </button>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
          style={{ background: "var(--primary)", color: "var(--text-inverse)" }}>
          {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : <Save size={13} />}
          {saved ? "Saved!" : "Save Menu"}
        </button>
      </div>
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────── */
export default function NavigationClient({ menus: initialMenus, pages }: {
  menus: Menu[];
  pages: Page[];
}) {
  const router = useRouter();
  const [menus,      setMenus]      = useState(initialMenus);
  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [creating,   setCreating]   = useState(false);
  const [newName,    setNewName]    = useState("");
  const [isPending,  startTransition] = useTransition();
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  function handleCreate() {
    if (!newName.trim()) return;
    startTransition(async () => {
      const menu = await createNavMenu(newName.trim());
      setMenus((prev) => [...prev, menu as unknown as Menu]);
      setNewName("");
      setCreating(false);
      setEditingId(menu.id);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    if (confirmDel !== id) { setConfirmDel(id); return; }
    startTransition(async () => {
      await deleteNavMenu(id);
      setMenus((prev) => prev.filter((m) => m.id !== id));
      if (editingId === id) setEditingId(null);
      setConfirmDel(null);
      router.refresh();
    });
  }

  const editingMenu = menus.find((m) => m.id === editingId);

  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Navigation</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            Build menus and link them to Navbar blocks in your pages.
          </p>
        </div>
        <button onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: "var(--primary)", color: "var(--text-inverse)" }}>
          <Plus size={14} /> New Menu
        </button>
      </div>

      {/* Create menu input */}
      {creating && (
        <div className="flex items-center gap-2 p-4 rounded-xl"
          style={{ border: "1px solid var(--primary)", background: "var(--primary-dim)" }}>
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setCreating(false); }}
            placeholder="Menu name (e.g. Main Nav, Footer)"
            className="flex-1 text-sm rounded-lg px-3 py-2 outline-none"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
          <button onClick={handleCreate} disabled={!newName.trim() || isPending}
            className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            style={{ background: "var(--primary)", color: "var(--text-inverse)" }}>
            {isPending ? <Loader2 size={13} className="animate-spin" /> : "Create"}
          </button>
          <button onClick={() => setCreating(false)} className="p-2 rounded-lg" style={{ color: "var(--text-muted)" }}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Menu list */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider px-1"
            style={{ color: "var(--text-muted)" }}>Your Menus ({menus.length})</p>

          {menus.length === 0 && !creating && (
            <div className="py-10 text-center rounded-xl"
              style={{ border: "2px dashed var(--border)", color: "var(--text-muted)" }}>
              <p className="text-sm">No menus yet.</p>
              <button onClick={() => setCreating(true)} className="text-xs mt-1 font-semibold"
                style={{ color: "var(--primary)" }}>Create your first →</button>
            </div>
          )}

          {menus.map((menu) => {
            let count = 0;
            try { count = JSON.parse(menu.items).length; } catch { /* empty */ }
            const isActive = editingId === menu.id;
            return (
              <div key={menu.id}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer"
                style={{
                  background: isActive ? "var(--primary-dim)" : "var(--bg-surface)",
                  border:     `1px solid ${isActive ? "var(--primary)" : "var(--border)"}`,
                }}
                onClick={() => setEditingId(isActive ? null : menu.id)}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: isActive ? "var(--primary)" : "var(--text)" }}>
                    {menu.name}
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{count} item{count !== 1 ? "s" : ""}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(menu.id); }}
                  onMouseLeave={() => setConfirmDel(null)}
                  disabled={isPending}
                  className="shrink-0 px-2 py-1 rounded-lg text-[10px] font-medium"
                  style={{
                    background: confirmDel === menu.id ? "var(--danger)" : "var(--bg-raised)",
                    color:      confirmDel === menu.id ? "#fff" : "var(--danger)",
                  }}>
                  {confirmDel === menu.id ? "Sure?" : "Delete"}
                </button>
              </div>
            );
          })}
        </div>

        {/* Editor panel */}
        <div className="rounded-xl p-5"
          style={{ border: "1px solid var(--border)", background: "var(--bg-surface)", minHeight: 300 }}>
          {editingMenu ? (
            <MenuEditor
              key={editingMenu.id}
              menu={editingMenu}
              pages={pages}
              onClose={() => setEditingId(null)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center gap-2">
              <Link2 size={20} style={{ color: "var(--text-muted)", opacity: 0.4 }} />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {menus.length > 0 ? "Select a menu to edit." : "Create a menu to get started."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Usage tip */}
      {menus.length > 0 && (
        <div className="p-4 rounded-xl text-sm" style={{ background: "var(--bg-raised)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
          <strong style={{ color: "var(--text)" }}>How to use:</strong>{" "}
          Open a page in the block editor → select a Navbar block → choose a menu from the <em>Navigation Menu</em> dropdown. The navbar will use your menu links instead of the manual links field.
        </div>
      )}
    </div>
  );
}

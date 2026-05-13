"use client";

import { useState, useRef, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Upload, Trash2, Loader2, FolderOpen, X,
  FileText, Film, Music, FileJson, File as FileIcon,
} from "lucide-react";
import { deleteFile } from "@/lib/actions/files";
import type { File as DbFile } from "@prisma/client";
import Image from "next/image";

/* ── Helpers ─────────────────────────────────────────────── */
function formatBytes(bytes: number) {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 ** 2)  return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function isImage(mime: string) { return mime.startsWith("image/"); }
function isVideo(mime: string) { return mime.startsWith("video/"); }
function isAudio(mime: string) { return mime.startsWith("audio/"); }

function FileTypeIcon({ mime, size = 28 }: { mime: string; size?: number }) {
  if (isImage(mime)) return null;
  if (isVideo(mime)) return <Film    size={size} />;
  if (isAudio(mime)) return <Music   size={size} />;
  if (mime === "application/json") return <FileJson size={size} />;
  if (mime === "application/pdf" || mime.startsWith("text/")) return <FileText size={size} />;
  return <FileIcon size={size} />;
}

/* ── File card ───────────────────────────────────────────── */
function FileCard({ file }: { file: DbFile }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview]        = useState(false);

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirming) { setConfirming(true); return; }
    startTransition(async () => {
      await deleteFile(file.id);
      router.refresh();
    });
  }

  return (
    <>
      <div
        className="group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-150"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
        onClick={() => setPreview(true)}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-light)"; }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
          setConfirming(false);
        }}
      >
        {/* Thumbnail */}
        <div className="relative w-full aspect-square flex items-center justify-center overflow-hidden"
          style={{ background: "var(--bg-raised)" }}>
          {isImage(file.mime) ? (
            <Image
              src={(file as typeof file & { thumbnailUrl?: string | null }).thumbnailUrl ?? file.url}
              alt={file.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          ) : (
            <div style={{ color: "var(--text-muted)" }}>
              <FileTypeIcon mime={file.mime} size={36} />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="px-3 py-2.5">
          <p className="text-xs font-medium truncate" style={{ color: "var(--text)" }}>{file.name}</p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{formatBytes(file.size)}</p>
        </div>

        {/* Delete overlay */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium shadow-lg"
            style={{
              background: confirming ? "var(--danger)" : "rgba(0,0,0,0.7)",
              color:      "#fff",
            }}
          >
            {isPending ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
            {confirming ? "Sure?" : "Delete"}
          </button>
        </div>
      </div>

      {/* Preview lightbox */}
      {preview && (
        <div
          className="fixed inset-0 z-200 flex items-center justify-center p-6"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
          onClick={() => setPreview(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-xl"
            style={{ background: "rgba(255,255,255,0.1)", color: "#fff" }}
            onClick={() => setPreview(false)}
          >
            <X size={18} />
          </button>
          <div onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-4 max-w-3xl w-full">
            {isImage(file.mime) ? (
              <img
                src={file.url}
                alt={file.name}
                className="max-h-[70vh] max-w-full rounded-xl object-contain"
              />
            ) : isVideo(file.mime) ? (
              <video src={file.url} controls className="max-h-[70vh] max-w-full rounded-xl" />
            ) : isAudio(file.mime) ? (
              <audio src={file.url} controls className="w-full" />
            ) : (
              <div className="flex flex-col items-center gap-3 py-12">
                <div style={{ color: "rgba(255,255,255,0.4)" }}><FileTypeIcon mime={file.mime} size={56} /></div>
                <a href={file.url} download={file.name}
                  className="text-sm px-4 py-2 rounded-lg"
                  style={{ background: "var(--primary)", color: "#fff" }}>
                  Download
                </a>
              </div>
            )}
            <div className="text-center">
              <p className="text-sm font-medium text-white">{file.name}</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                {file.mime} · {formatBytes(file.size)}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Upload zone ─────────────────────────────────────────── */
function UploadZone({ onUploaded }: { onUploaded: () => void }) {
  const inputRef  = useRef<HTMLInputElement>(null);
  const [dragging, setDragging]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState<string[]>([]);

  async function uploadFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    if (!arr.length) return;
    setUploading(true);
    setProgress([`Uploading ${arr.length} file${arr.length > 1 ? "s" : ""}…`]);

    const fd = new FormData();
    arr.forEach((f) => fd.append("files", f));

    const res  = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await res.json();

    if (!res.ok) {
      setProgress([`Error: ${json.error}`]);
    } else {
      setProgress([`✓ Uploaded ${json.files.length} file${json.files.length > 1 ? "s" : ""}`]);
      onUploaded();
    }

    setUploading(false);
    setTimeout(() => setProgress([]), 3000);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    uploadFiles(e.dataTransfer.files);
  }, []);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className="rounded-xl flex flex-col items-center justify-center gap-3 py-10 cursor-pointer transition-all duration-150"
      style={{
        border:     `2px dashed ${dragging ? "var(--primary)" : "var(--border)"}`,
        background: dragging ? "var(--primary-dim)" : "transparent",
        color:      dragging ? "var(--primary)"     : "var(--text-muted)",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        accept="image/*,video/*,audio/*,application/pdf,text/plain,text/csv,application/json"
      />
      {uploading ? (
        <Loader2 size={28} className="animate-spin" />
      ) : (
        <Upload size={28} />
      )}
      <div className="text-center">
        <p className="text-sm font-medium">
          {uploading ? "Uploading…" : "Drop files here or click to browse"}
        </p>
        {!uploading && (
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Images, video, audio, PDF, CSV, JSON · max 20 MB
          </p>
        )}
        {progress.map((msg, i) => (
          <p key={i} className="text-xs mt-1" style={{ color: msg.startsWith("Error") ? "var(--danger)" : "var(--success)" }}>
            {msg}
          </p>
        ))}
      </div>
    </div>
  );
}

/* ── Main client ─────────────────────────────────────────── */
export default function FilesClient({
  initialFiles,
  total,
}: {
  initialFiles: DbFile[];
  total: number;
}) {
  const router = useRouter();
  const [files] = useState<DbFile[]>(initialFiles);

  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Media Library</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            {total} file{total !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Upload zone */}
      <UploadZone onUploaded={() => router.refresh()} />

      {/* Grid */}
      {files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-xl gap-3"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
            <FolderOpen size={26} />
          </div>
          <p className="text-base font-semibold" style={{ color: "var(--text)" }}>No files yet</p>
          <p className="text-sm text-center max-w-sm" style={{ color: "var(--text-muted)" }}>
            Upload images, documents, and other assets using the drop zone above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {files.map((f) => <FileCard key={f.id} file={f} />)}
        </div>
      )}
    </div>
  );
}

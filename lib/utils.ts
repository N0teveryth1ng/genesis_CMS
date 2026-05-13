import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string, opts?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...opts,
  }).format(new Date(date));
}

export function formatRelative(date: Date | string) {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;

  const secs  = Math.floor(diff / 1000);
  const mins  = Math.floor(secs / 60);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);

  if (secs  <  60) return "just now";
  if (mins  <  60) return `${mins}m ago`;
  if (hours <  24) return `${hours}h ago`;
  if (days  <   7) return `${days}d ago`;
  return formatDate(date);
}

export function slugify(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "_")
    .replace(/^-+|-+$/g, "");
}

export function truncate(str: string, len: number) {
  return str.length > len ? str.slice(0, len) + "…" : str;
}

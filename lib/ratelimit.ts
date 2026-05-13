/* In-memory rate limiter — resets on cold start, good enough for single-instance */

interface Window {
  count:     number;
  resetAt:   number;
}

const store = new Map<string, Window>();

/* Clean up expired entries every 5 minutes to prevent memory leak */
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, win] of store) {
      if (win.resetAt < now) store.delete(key);
    }
  }, 5 * 60 * 1000);
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const win = store.get(key);

  if (!win || win.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  win.count += 1;
  const remaining = Math.max(0, limit - win.count);
  return { allowed: win.count <= limit, remaining, resetAt: win.resetAt };
}

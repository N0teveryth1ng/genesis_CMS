import { redisPub, redisSub, hasRedis } from "./redis";

export const SSE_CHANNEL = "genesis:sse";

type Controller = ReadableStreamDefaultController<Uint8Array>;
const localClients = new Set<Controller>();
const enc          = new TextEncoder();

/* ── Publish (server actions + API routes call this) ─────── */
export async function publish(event: string, data: unknown): Promise<void> {
  const payload = JSON.stringify({ event, data });
  if (hasRedis() && redisPub) {
    await redisPub.publish(SSE_CHANNEL, payload);
  } else {
    broadcastLocal(event, data);
  }
}

/* ── Local broadcast (single-process fallback) ───────────── */
export function broadcastLocal(event: string, data: unknown) {
  const msg  = enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  const dead: Controller[] = [];
  for (const ctrl of localClients) {
    try { ctrl.enqueue(msg); }
    catch { dead.push(ctrl); }
  }
  dead.forEach((c) => localClients.delete(c));
}

/* ── Register / unregister local SSE clients ─────────────── */
export function registerLocal(ctrl: Controller)   { localClients.add(ctrl); }
export function unregisterLocal(ctrl: Controller) { localClients.delete(ctrl); }

/* ── Subscribe to Redis (called once per SSE connection) ─── */
export function subscribeRedis(onMessage: (event: string, data: unknown) => void) {
  if (!hasRedis() || !redisSub) return null;

  const handler = (channel: string, message: string) => {
    if (channel !== SSE_CHANNEL) return;
    try {
      const { event, data } = JSON.parse(message) as { event: string; data: unknown };
      onMessage(event, data);
    } catch { /* malformed message */ }
  };

  redisSub.subscribe(SSE_CHANNEL).catch(() => {});
  redisSub.on("message", handler);

  return () => {
    redisSub!.off("message", handler);
  };
}

import { type NextRequest } from "next/server";
import { registerLocal, unregisterLocal, subscribeRedis } from "@/lib/pubsub";
import { hasRedis } from "@/lib/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(req: NextRequest) {
  const enc = new TextEncoder();
  let ctrl: ReadableStreamDefaultController<Uint8Array>;
  let unsubRedis: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      ctrl = controller;
      controller.enqueue(enc.encode(`event: connected\ndata: {}\n\n`));

      if (hasRedis()) {
        /* Redis mode — one subscriber per connection */
        unsubRedis = subscribeRedis((event, data) => {
          try {
            controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          } catch { /* client disconnected */ }
        });
      } else {
        /* Local mode — register in module-level Set */
        registerLocal(ctrl);
      }
    },
    cancel() {
      unsubRedis?.();
      if (!hasRedis()) unregisterLocal(ctrl);
    },
  });

  req.signal.addEventListener("abort", () => {
    unsubRedis?.();
    if (!hasRedis()) unregisterLocal(ctrl);
    try { ctrl.close(); } catch { /* already closed */ }
  });

  return new Response(stream, {
    headers: {
      "Content-Type":     "text/event-stream",
      "Cache-Control":    "no-cache, no-transform",
      "Connection":       "keep-alive",
      "X-Accel-Buffering":"no",
    },
  });
}

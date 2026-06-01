import { type NextRequest } from "next/server";
import { registerSSEClient, unregisterSSEClient } from "@/lib/sse";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(req: NextRequest) {
  const enc = new TextEncoder();
  let ctrl: ReadableStreamDefaultController<Uint8Array>;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      ctrl = controller;
      registerSSEClient(ctrl);
      controller.enqueue(enc.encode(`event: connected\ndata: {}\n\n`));
    },
    cancel() {
      unregisterSSEClient(ctrl);
    },
  });

  req.signal.addEventListener("abort", () => {
    unregisterSSEClient(ctrl);
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

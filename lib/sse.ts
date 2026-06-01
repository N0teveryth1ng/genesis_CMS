type Controller = ReadableStreamDefaultController<Uint8Array>;

const clients = new Set<Controller>();
const enc     = new TextEncoder();

export function registerSSEClient(ctrl: Controller) {
  clients.add(ctrl);
}

export function unregisterSSEClient(ctrl: Controller) {
  clients.delete(ctrl);
}

export function broadcast(event: string, data: unknown) {
  if (clients.size === 0) return;
  const msg  = enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  const dead: Controller[] = [];
  for (const ctrl of clients) {
    try { ctrl.enqueue(msg); }
    catch { dead.push(ctrl); }
  }
  dead.forEach((c) => clients.delete(c));
}

import { publish } from "./pubsub";

/* broadcast() is now just a thin wrapper around the pubsub layer.
   Local clients are managed in pubsub.ts; Redis pub/sub replaces the
   module-level Set when REDIS_URL is set. */
export async function broadcast(event: string, data: unknown) {
  await publish(event, data);
}

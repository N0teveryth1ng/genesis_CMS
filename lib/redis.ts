import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL;

/* Singleton clients — null when Redis isn't configured */
let pub: Redis | null = null;
let sub: Redis | null = null;
let client: Redis | null = null;

if (REDIS_URL) {
  const opts = { maxRetriesPerRequest: null, enableReadyCheck: false, lazyConnect: true };
  client = new Redis(REDIS_URL, opts);
  pub    = new Redis(REDIS_URL, opts);
  sub    = new Redis(REDIS_URL, opts);

  /* Swallow connection errors so missing Redis doesn't crash the app */
  [client, pub, sub].forEach((r) => r?.on("error", () => {}));
}

export { client as redis, pub as redisPub, sub as redisSub };
export const hasRedis = () => !!REDIS_URL;

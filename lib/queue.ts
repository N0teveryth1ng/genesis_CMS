import { Queue, Worker, type Job } from "bullmq";
import { logger } from "./logger";

export type JobName = "send-webhook" | "run-flow" | "send-email";

export interface WebhookJobData {
  url: string; secret?: string; payload: unknown; attempt?: number;
}
export interface FlowJobData {
  flowId: string; triggeredBy: string; recordData: unknown;
}
export interface EmailJobData {
  to: string; subject: string; html: string;
}

const REDIS_URL = process.env.REDIS_URL;

/* BullMQ uses its own bundled ioredis — pass URL string, not an ioredis instance */
function getConnectionOpts() {
  if (!REDIS_URL) return null;
  return { connection: { url: REDIS_URL, maxRetriesPerRequest: null, enableReadyCheck: false } };
}

let queue: Queue | null = null;

export function getQueue(): Queue | null {
  if (!REDIS_URL) return null;
  const opts = getConnectionOpts()!;
  if (!queue) queue = new Queue("genesis", opts);
  return queue;
}

export async function enqueue<T>(name: JobName, data: T, opts?: { delay?: number; attempts?: number }) {
  const q = getQueue();
  if (!q) {
    logger.warn({ job: name }, "Queue not available — job dropped (set REDIS_URL to enable)");
    return;
  }
  return q.add(name, data, {
    attempts: opts?.attempts ?? 3,
    delay:    opts?.delay,
    backoff:  { type: "exponential", delay: 2000 },
  });
}

export function startWorker(
  handlers: Partial<Record<JobName, (job: Job) => Promise<void>>>
) {
  const opts = getConnectionOpts();
  if (!opts) return null;

  return new Worker(
    "genesis",
    async (job: Job) => {
      const handler = handlers[job.name as JobName];
      if (!handler) { logger.warn({ job: job.name }, "No handler for job"); return; }
      await handler(job);
    },
    { ...opts, concurrency: 5 }
  );
}

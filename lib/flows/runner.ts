/**
 * Flow execution engine.
 * Runs a flow's steps sequentially, short-circuiting on a failed condition.
 */

import { db } from "@/lib/db";
import type { FlowStep, TriggerConfig } from "@/lib/actions/flows";

type RunContext = {
  trigger: string;
  payload: Record<string, unknown>;
};

export async function runFlow(flowId: string, ctx: RunContext) {
  const flow = await db.flow.findUnique({ where: { id: flowId } });
  if (!flow) return;

  const logLines: string[] = [];
  const log = (msg: string) => logLines.push(`[${new Date().toISOString()}] ${msg}`);

  const run = await db.flowRun.create({
    data: { flowId, status: "running", log: "[]" },
  });

  let status: "success" | "error" = "success";

  try {
    const steps = JSON.parse(flow.steps) as FlowStep[];
    log(`Flow "${flow.name}" started — trigger: ${ctx.trigger}`);

    for (const step of steps) {
      if (step.type === "condition") {
        const fieldVal = String(ctx.payload[step.field] ?? "");
        const passes   = evaluateCondition(fieldVal, step.op, step.value);
        log(`Condition [${step.field} ${step.op} ${step.value}] → ${passes ? "PASS" : "STOP"}`);
        if (!passes) break;

      } else if (step.type === "webhook") {
        const body = resolveTemplate(step.body ?? "{}", ctx.payload);
        let headers: Record<string, string> = { "Content-Type": "application/json" };
        try { headers = { ...headers, ...JSON.parse(step.headers ?? "{}") }; } catch { /* empty */ }

        const res = await fetch(step.url, {
          method:  step.method ?? "POST",
          headers,
          body:    step.method === "GET" ? undefined : body,
        });
        log(`Webhook ${step.method} ${step.url} → ${res.status}`);
        if (!res.ok) { status = "error"; break; }

      } else if (step.type === "create_record") {
        const { insertDynamicRow } = await import("@/lib/db-dynamic");
        const col = await db.collection.findUnique({ where: { id: step.collectionId } });
        if (!col?.tableName) { log(`Collection ${step.collectionId} not found`); status = "error"; break; }

        let data: Record<string, unknown> = {};
        try { data = JSON.parse(resolveTemplate(step.data, ctx.payload)); } catch { /* empty */ }

        const rec = await insertDynamicRow(col.tableName, col.id, data);
        log(`Created record ${rec.id} in ${col.name}`);

      } else if (step.type === "log") {
        log(`LOG: ${resolveTemplate(step.message, ctx.payload)}`);
      }
    }

    log(`Flow finished — status: ${status}`);
  } catch (err) {
    status = "error";
    log(`Error: ${String(err)}`);
  }

  await db.flowRun.update({
    where: { id: run.id },
    data:  { status, log: JSON.stringify(logLines), endedAt: new Date() },
  });

  await db.flow.update({
    where: { id: flowId },
    data:  { runCount: { increment: 1 }, lastRunAt: new Date() },
  });
}

/* ── Helpers ─────────────────────────────────────────────── */

function evaluateCondition(fieldVal: string, op: string, target: string): boolean {
  switch (op) {
    case "eq":          return fieldVal === target;
    case "neq":         return fieldVal !== target;
    case "contains":    return fieldVal.toLowerCase().includes(target.toLowerCase());
    case "not_contains":return !fieldVal.toLowerCase().includes(target.toLowerCase());
    case "gt":          return parseFloat(fieldVal) > parseFloat(target);
    case "lt":          return parseFloat(fieldVal) < parseFloat(target);
    case "empty":       return !fieldVal;
    case "not_empty":   return !!fieldVal;
    default:            return true;
  }
}

function resolveTemplate(template: string, payload: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(payload[key] ?? ""));
}

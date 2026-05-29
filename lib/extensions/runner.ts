/**
 * Runs all active extensions for a given event + collectionId.
 * Extensions transform data synchronously before it's saved.
 */

import { db } from "@/lib/db";
import { getPlugin } from "./registry";

export async function applyExtensions(
  collectionId: string,
  data:         Record<string, unknown>,
  event:        "create" | "update",
): Promise<Record<string, unknown>> {
  const extensions = await db.extension.findMany({
    where: { active: true },
  });

  const matching = extensions.filter((ext) => {
    const eventMatch = ext.events.split(",").map((e) => e.trim()).includes(event);
    const colMatch   = !ext.collectionId || ext.collectionId === collectionId;
    return eventMatch && colMatch;
  });

  let result = { ...data };

  for (const ext of matching) {
    const plugin = getPlugin(ext.pluginId);
    if (!plugin) continue;

    let config: Record<string, unknown> = {};
    try { config = JSON.parse(ext.config); } catch { /* empty */ }

    try {
      result = plugin.execute(result, config, event);
    } catch { /* skip broken extension */ }
  }

  return result;
}

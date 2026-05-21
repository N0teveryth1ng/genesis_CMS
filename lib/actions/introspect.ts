"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { listIntrospectableTables, getTableColumns, SYSTEM_COLUMNS } from "@/lib/db-introspect";
import type { IntrospectedTable } from "@/lib/db-introspect";

export { listIntrospectableTables };

/* ── Convert snake_case / kebab-case table name to Title Case label */
function tableNameToLabel(name: string): string {
  return name
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ── Import one or more existing tables as Genesis collections ── */
export async function importTablesAsCollections(tableNames: string[]): Promise<{
  imported: string[];
  errors: Record<string, string>;
}> {
  const imported: string[] = [];
  const errors: Record<string, string> = {};

  for (const tableName of tableNames) {
    try {
      // Derive a slug from the table name
      const name = tableName.toLowerCase().replace(/[^a-z0-9_]/g, "_");

      // Ensure no duplicate collection name
      const existing = await db.collection.findUnique({ where: { name } });
      if (existing) {
        errors[tableName] = `Collection "${name}" already exists`;
        continue;
      }

      const label = tableNameToLabel(tableName);

      // Fetch columns from information_schema
      const columns = await getTableColumns(tableName);

      // Create the Collection pointing at the existing table — do NOT CREATE TABLE
      const collection = await db.collection.create({
        data: { name, label, icon: "Database", tableName },
      });

      // Register each column as a Field (skip system columns)
      let sortOrder = 0;
      for (const col of columns) {
        if (SYSTEM_COLUMNS.has(col.name)) continue;

        await db.field.create({
          data: {
            collectionId: collection.id,
            name:         col.name,
            label:        tableNameToLabel(col.name),
            type:         col.cmsType,
            required:     !col.nullable && !col.hasDefault,
            sortOrder:    sortOrder++,
          },
        });
      }

      imported.push(tableName);
    } catch (err: unknown) {
      errors[tableName] = err instanceof Error ? err.message : String(err);
    }
  }

  revalidatePath("/collections");
  return { imported, errors };
}

/* ── Get full introspection payload for the modal ─────────── */
export async function getIntrospectionData(): Promise<IntrospectedTable[]> {
  return listIntrospectableTables();
}

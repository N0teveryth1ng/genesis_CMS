/**
 * DB Introspection — queries information_schema to discover existing Postgres
 * tables and their columns so Genesis can import them as collections.
 */

import { db } from "@/lib/db";

export type IntrospectedColumn = {
  name: string;
  pgType: string;       // raw postgres type
  cmsType: string;      // mapped Genesis field type
  nullable: boolean;
  hasDefault: boolean;
};

export type IntrospectedTable = {
  tableName: string;
  columns: IntrospectedColumn[];
};

// ── Postgres type → Genesis field type ───────────────────────
function pgTypeToCms(pgType: string): string {
  const t = pgType.toLowerCase();
  if (t.includes("int") || t === "numeric" || t === "decimal" || t === "real" || t.includes("float") || t === "money")
    return "number";
  if (t === "boolean" || t === "bool")
    return "boolean";
  if (t === "date")
    return "date";
  if (t.includes("timestamp"))
    return "datetime";
  if (t === "jsonb" || t === "json")
    return "json";
  if (t === "uuid")
    return "uuid";
  return "text";
}

// Genesis/Prisma system tables that should never be imported
const SYSTEM_TABLES = new Set([
  "_prisma_migrations",
  "User", "Collection", "Field", "Record", "File",
  "AuditLog", "Webhook", "Permission", "Settings",
  "ApiKey", "Page", "GitIntegration",
  // lowercase variants (Postgres folds unquoted identifiers)
  "user", "collection", "field", "record", "file",
  "auditlog", "webhook", "permission", "settings",
  "apikey", "page", "gitintegration",
]);

// Columns that Genesis manages internally — skip when creating Fields
const SYSTEM_COLUMNS = new Set(["id", "created_at", "updated_at", "createdAt", "updatedAt"]);

/* ── List all public tables not yet imported ─────────────── */
export async function listIntrospectableTables(): Promise<IntrospectedTable[]> {
  // Fetch all registered genesis tableName values
  const registered = await db.collection.findMany({
    select: { tableName: true },
  });
  const registeredSet = new Set(registered.map((c) => c.tableName).filter(Boolean));

  // Query all public base tables
  const tables = await db.$queryRawUnsafe<Array<{ table_name: string }>>(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_type   = 'BASE TABLE'
     ORDER BY table_name`,
  );

  const result: IntrospectedTable[] = [];

  for (const { table_name } of tables) {
    if (SYSTEM_TABLES.has(table_name)) continue;
    if (registeredSet.has(table_name)) continue;   // already imported

    const cols = await db.$queryRawUnsafe<
      Array<{
        column_name: string;
        data_type: string;
        is_nullable: string;
        column_default: string | null;
      }>
    >(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name   = $1
       ORDER BY ordinal_position`,
      table_name,
    );

    result.push({
      tableName: table_name,
      columns: cols.map((c) => ({
        name:       c.column_name,
        pgType:     c.data_type,
        cmsType:    pgTypeToCms(c.data_type),
        nullable:   c.is_nullable === "YES",
        hasDefault: c.column_default !== null,
      })),
    });
  }

  return result;
}

/* ── Get columns for a single table ─────────────────────── */
export async function getTableColumns(tableName: string): Promise<IntrospectedColumn[]> {
  const cols = await db.$queryRawUnsafe<
    Array<{
      column_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
    }>
  >(
    `SELECT column_name, data_type, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name   = $1
     ORDER BY ordinal_position`,
    tableName,
  );

  return cols.map((c) => ({
    name:       c.column_name,
    pgType:     c.data_type,
    cmsType:    pgTypeToCms(c.data_type),
    nullable:   c.is_nullable === "YES",
    hasDefault: c.column_default !== null,
  }));
}

export { SYSTEM_COLUMNS };

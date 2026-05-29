/**
 * Dynamic table layer — each Genesis collection gets a real Postgres table.
 * Tables are named  genesis_col_{collection_name}  and managed via raw SQL.
 * All functions return data shaped to match the Prisma Record model so
 * existing UI code needs zero changes.
 */

import { db } from "@/lib/db";

// ── Helpers ───────────────────────────────────────────────────

/** Wrap identifier in double-quotes after sanitising */
function ident(name: string): string {
  const clean = name.replace(/[^a-z0-9_]/gi, "_");
  return `"${clean}"`;
}

/** Map CMS field type → Postgres column type */
function fieldTypeToSql(type: string): string {
  switch (type) {
    case "number":   return "NUMERIC";
    case "boolean":  return "BOOLEAN";
    case "date":     return "DATE";
    case "datetime": return "TIMESTAMPTZ";
    case "json":     return "JSONB";
    default:         return "TEXT"; // text | textarea | email | url | password | select | uuid | relation
  }
}

/** Derive table name from collection slug */
export function tableNameForCollection(collectionName: string): string {
  return `genesis_col_${collectionName.replace(/[^a-z0-9]/gi, "_").toLowerCase()}`;
}

// ── DDL ───────────────────────────────────────────────────────

export async function createDynamicTable(tableName: string): Promise<void> {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ${ident(tableName)} (
      "id"         TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "created_at" TIMESTAMPTZ NOT NULL    DEFAULT NOW(),
      "updated_at" TIMESTAMPTZ NOT NULL    DEFAULT NOW()
    )
  `);
}

export async function dropDynamicTable(tableName: string): Promise<void> {
  await db.$executeRawUnsafe(`DROP TABLE IF EXISTS ${ident(tableName)}`);
}

export async function addDynamicColumn(
  tableName: string,
  fieldName: string,
  fieldType: string,
): Promise<void> {
  const sqlType = fieldTypeToSql(fieldType);
  await db.$executeRawUnsafe(
    `ALTER TABLE ${ident(tableName)} ADD COLUMN IF NOT EXISTS ${ident(fieldName)} ${sqlType}`,
  );
}

export async function dropDynamicColumn(
  tableName: string,
  fieldName: string,
): Promise<void> {
  await db.$executeRawUnsafe(
    `ALTER TABLE ${ident(tableName)} DROP COLUMN IF EXISTS ${ident(fieldName)}`,
  );
}

export async function createJunctionTable(
  junctionTable: string,
  colAField: string,  // e.g. "post_id"
  colBField: string,  // e.g. "tag_id"
): Promise<void> {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ${ident(junctionTable)} (
      "id"       TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      ${ident(colAField)} TEXT NOT NULL,
      ${ident(colBField)} TEXT NOT NULL,
      UNIQUE (${ident(colAField)}, ${ident(colBField)})
    )
  `);
}

export async function dropJunctionTable(junctionTable: string): Promise<void> {
  await db.$executeRawUnsafe(`DROP TABLE IF EXISTS ${ident(junctionTable)}`);
}

// ── Advanced query types ──────────────────────────────────────

export type FilterOp = "_eq" | "_neq" | "_lt" | "_lte" | "_gt" | "_gte" | "_contains" | "_null" | "_in";

export type FilterClause = {
  field: string;
  op:    FilterOp;
  value: unknown;
};

export type SortClause = { field: string; dir: "ASC" | "DESC" };

export type AdvancedQueryOpts = {
  filters?:  FilterClause[];
  sort?:     SortClause;
  fields?:   string[];           // undefined = all columns
  search?:   { term: string; textFields: string[] };
  page:      number;
  pageSize:  number;
};

function buildWhere(
  filters: FilterClause[] = [],
  search?: { term: string; textFields: string[] },
  startIdx = 1,
): { sql: string; params: unknown[]; nextIdx: number } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = startIdx;

  for (const f of filters) {
    const col = ident(f.field);
    switch (f.op) {
      case "_eq":       conditions.push(`${col} = $${idx++}`);             params.push(f.value); break;
      case "_neq":      conditions.push(`${col} != $${idx++}`);            params.push(f.value); break;
      case "_lt":       conditions.push(`${col} < $${idx++}`);             params.push(f.value); break;
      case "_lte":      conditions.push(`${col} <= $${idx++}`);            params.push(f.value); break;
      case "_gt":       conditions.push(`${col} > $${idx++}`);             params.push(f.value); break;
      case "_gte":      conditions.push(`${col} >= $${idx++}`);            params.push(f.value); break;
      case "_contains": conditions.push(`${col}::text ILIKE $${idx++}`);   params.push(`%${f.value}%`); break;
      case "_null":     conditions.push(f.value ? `${col} IS NULL` : `${col} IS NOT NULL`); break;
      case "_in": {
        const vals = Array.isArray(f.value) ? f.value : String(f.value).split(",");
        const ph   = vals.map(() => `$${idx++}`).join(", ");
        conditions.push(`${col} = ANY(ARRAY[${ph}])`);
        params.push(...vals);
        break;
      }
    }
  }

  if (search?.term && search.textFields.length > 0) {
    const sub = search.textFields.map((f) => {
      params.push(`%${search.term}%`);
      return `${ident(f)}::text ILIKE $${idx++}`;
    });
    conditions.push(`(${sub.join(" OR ")})`);
  }

  return {
    sql:     conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
    nextIdx: idx,
  };
}

// ── Shared return shape ───────────────────────────────────────

type DynRecord = {
  id: string;
  collectionId: string;
  data: string;        // JSON blob of field values — matches Prisma Record.data
  createdAt: Date;
  updatedAt: Date;
};

function rowToRecord(
  row: Record<string, unknown>,
  collectionId: string,
): DynRecord {
  const { id, created_at, updated_at, ...fields } = row;
  return {
    id: id as string,
    collectionId,
    data: JSON.stringify(fields),
    createdAt: created_at as Date,
    updatedAt: updated_at as Date,
  };
}

// ── DML ───────────────────────────────────────────────────────

export async function insertDynamicRow(
  tableName: string,
  collectionId: string,
  data: Record<string, unknown>,
): Promise<DynRecord> {
  const keys = Object.keys(data);

  if (keys.length === 0) {
    const rows = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `INSERT INTO ${ident(tableName)} DEFAULT VALUES RETURNING *`,
    );
    return rowToRecord(rows[0], collectionId);
  }

  const cols         = keys.map(ident).join(", ");
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
  const values       = keys.map((k) => data[k]);

  const rows = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `INSERT INTO ${ident(tableName)} (${cols}) VALUES (${placeholders}) RETURNING *`,
    ...values,
  );
  return rowToRecord(rows[0], collectionId);
}

export async function updateDynamicRow(
  tableName: string,
  collectionId: string,
  rowId: string,
  data: Record<string, unknown>,
): Promise<DynRecord> {
  const keys = Object.keys(data);

  if (keys.length === 0) {
    const rows = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `UPDATE ${ident(tableName)} SET "updated_at" = NOW() WHERE "id" = $1 RETURNING *`,
      rowId,
    );
    return rowToRecord(rows[0], collectionId);
  }

  const setClauses = keys.map((k, i) => `${ident(k)} = $${i + 1}`).join(", ");
  const values     = keys.map((k) => data[k]);

  const rows = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `UPDATE ${ident(tableName)} SET ${setClauses}, "updated_at" = NOW() WHERE "id" = $${keys.length + 1} RETURNING *`,
    ...values,
    rowId,
  );
  return rowToRecord(rows[0], collectionId);
}

export async function deleteDynamicRow(
  tableName: string,
  rowId: string,
): Promise<void> {
  await db.$executeRawUnsafe(
    `DELETE FROM ${ident(tableName)} WHERE "id" = $1`,
    rowId,
  );
}

export async function getDynamicRow(
  tableName: string,
  collectionId: string,
  rowId: string,
): Promise<DynRecord | null> {
  const rows = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT * FROM ${ident(tableName)} WHERE "id" = $1 LIMIT 1`,
    rowId,
  );
  if (!rows.length) return null;
  return rowToRecord(rows[0], collectionId);
}

export async function queryDynamicRows(
  tableName: string,
  collectionId: string,
  page: number,
  pageSize: number,
): Promise<{ records: DynRecord[]; total: number; page: number; pageSize: number }> {
  const offset = (page - 1) * pageSize;

  const [rows, countResult] = await Promise.all([
    db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT * FROM ${ident(tableName)} ORDER BY "created_at" DESC LIMIT $1 OFFSET $2`,
      pageSize,
      offset,
    ),
    db.$queryRawUnsafe<Array<{ count: string }>>(
      `SELECT COUNT(*) AS count FROM ${ident(tableName)}`,
    ),
  ]);

  const total   = parseInt(countResult[0]?.count ?? "0", 10);
  const records = rows.map((r) => rowToRecord(r, collectionId));
  return { records, total, page, pageSize };
}

export async function queryDynamicRowsAdvanced(
  tableName: string,
  collectionId: string,
  opts: AdvancedQueryOpts,
): Promise<{ records: DynRecord[]; total: number; page: number; pageSize: number }> {
  const { filters, sort, fields, search, page, pageSize } = opts;
  const offset = (page - 1) * pageSize;

  const { sql: whereSQL, params: whereParams, nextIdx } = buildWhere(filters, search);

  // SELECT clause — always include system columns
  const selectCols = fields && fields.length > 0
    ? [...new Set(["id", "created_at", "updated_at", ...fields])].map(ident).join(", ")
    : "*";

  // ORDER BY
  const orderSQL = sort
    ? `ORDER BY ${ident(sort.field)} ${sort.dir}`
    : `ORDER BY "created_at" DESC`;

  const dataSQL  = `SELECT ${selectCols} FROM ${ident(tableName)} ${whereSQL} ${orderSQL} LIMIT $${nextIdx} OFFSET $${nextIdx + 1}`;
  const countSQL = `SELECT COUNT(*) AS count FROM ${ident(tableName)} ${whereSQL}`;

  const [rows, countResult] = await Promise.all([
    db.$queryRawUnsafe<Array<Record<string, unknown>>>(dataSQL, ...whereParams, pageSize, offset),
    db.$queryRawUnsafe<Array<{ count: string }>>(countSQL, ...whereParams),
  ]);

  const total   = parseInt(countResult[0]?.count ?? "0", 10);
  const records = rows.map((r) => rowToRecord(r, collectionId));
  return { records, total, page, pageSize };
}

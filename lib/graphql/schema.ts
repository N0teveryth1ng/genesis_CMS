/**
 * Dynamically builds a GraphQL schema from Genesis collections.
 * Called once per request — schema reflects the live DB structure.
 */

import { db } from "@/lib/db";
import { queryDynamicRowsAdvanced, insertDynamicRow, updateDynamicRow, deleteDynamicRow, getDynamicRow } from "@/lib/db-dynamic";

/* ── CMS type → GraphQL scalar ───────────────────────────── */
function cmsToGql(type: string): string {
  switch (type) {
    case "number":             return "Float";
    case "boolean":            return "Boolean";
    case "uuid":               return "ID";
    case "json":               return "String";
    case "date":
    case "datetime":           return "String";
    default:                   return "String"; // text | textarea | email | url | password | select | relation
  }
}

/* ── Sanitize collection name for GQL type names ─────────── */
function gqlTypeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, "_").replace(/^[0-9]/, "_$&");
}

/* ── Build schema SDL + resolvers ────────────────────────── */
export async function buildDynamicSchema() {
  const collections = await db.collection.findMany({
    include: { fields: { orderBy: { sortOrder: "asc" } } },
  });

  if (collections.length === 0) {
    // Minimal valid schema when no collections exist
    return {
      typeDefs: `type Query { _empty: String }`,
      resolvers: { Query: { _empty: () => "No collections yet." } },
    };
  }

  const typeBlocks: string[]  = [];
  const queryFields: string[] = [];
  const mutationFields: string[] = [];
  const resolvers: Record<string, Record<string, unknown>> = {
    Query:    {},
    Mutation: {},
  };

  // ── Meta type for paginated lists ─────────────────────────
  typeBlocks.push(`
    type PageMeta {
      total: Int!
      page:  Int!
      limit: Int!
      pages: Int!
    }
  `);

  for (const col of collections) {
    const typeName  = gqlTypeName(col.name);
    const visFields = col.fields.filter((f) => !f.hidden);

    // ── Object type ───────────────────────────────────────
    const fieldLines = [
      `  id:         ID!`,
      `  createdAt:  String`,
      `  updatedAt:  String`,
      ...visFields.map((f) => {
        const gqlType = cmsToGql(f.type);
        const bang    = f.required ? "!" : "";
        return `  ${f.name}: ${gqlType}${bang}`;
      }),
    ];

    typeBlocks.push(`type ${typeName} {\n${fieldLines.join("\n")}\n}`);

    // ── List wrapper ──────────────────────────────────────
    typeBlocks.push(`type ${typeName}List { data: [${typeName}!]! meta: PageMeta! }`);

    // ── Input type ────────────────────────────────────────
    const inputLines = visFields.map((f) => {
      const gqlType = cmsToGql(f.type);
      return `  ${f.name}: ${gqlType}`;
    });
    typeBlocks.push(`input ${typeName}Input {\n${inputLines.join("\n")}\n}`);

    // ── Query fields ──────────────────────────────────────
    queryFields.push(
      `  ${col.name}(id: ID!): ${typeName}`,
      `  ${col.name}s(page: Int, limit: Int, sort: String, search: String): ${typeName}List!`,
    );

    // ── Mutation fields ───────────────────────────────────
    mutationFields.push(
      `  create_${col.name}(input: ${typeName}Input!): ${typeName}`,
      `  update_${col.name}(id: ID!, input: ${typeName}Input!): ${typeName}`,
      `  delete_${col.name}(id: ID!): Boolean`,
    );

    // ── Resolvers ─────────────────────────────────────────
    const colId      = col.id;
    const tableName  = col.tableName;

    // Single record
    resolvers.Query[col.name] = async (_: unknown, { id }: { id: string }) => {
      if (tableName) {
        const row = await getDynamicRow(tableName, colId, id);
        if (!row) return null;
        return flatRow(row);
      }
      const rec = await db.record.findFirst({ where: { id, collectionId: colId } });
      if (!rec) return null;
      return flatLegacy(rec);
    };

    // List
    resolvers.Query[`${col.name}s`] = async (
      _: unknown,
      { page = 1, limit = 50, sort, search }: { page?: number; limit?: number; sort?: string; search?: string },
    ) => {
      const pageN  = Math.max(1, page);
      const limitN = Math.min(100, limit);

      if (tableName) {
        const textFields = visFields
          .filter((f) => ["text", "textarea", "email", "url"].includes(f.type))
          .map((f) => f.name);

        let sortClause;
        if (sort) {
          const desc = sort.startsWith("-");
          sortClause = { field: desc ? sort.slice(1) : sort, dir: (desc ? "DESC" : "ASC") as "ASC" | "DESC" };
        }

        const result = await queryDynamicRowsAdvanced(tableName, colId, {
          sort:     sortClause,
          search:   search ? { term: search, textFields } : undefined,
          page:     pageN,
          pageSize: limitN,
        });

        return {
          data: result.records.map(flatRow),
          meta: { total: result.total, page: pageN, limit: limitN, pages: Math.ceil(result.total / limitN) },
        };
      }

      // Legacy
      const [records, total] = await Promise.all([
        db.record.findMany({ where: { collectionId: colId }, orderBy: { createdAt: "desc" }, skip: (pageN - 1) * limitN, take: limitN }),
        db.record.count({ where: { collectionId: colId } }),
      ]);
      return {
        data: records.map(flatLegacy),
        meta: { total, page: pageN, limit: limitN, pages: Math.ceil(total / limitN) },
      };
    };

    // Create
    resolvers.Mutation[`create_${col.name}`] = async (_: unknown, { input }: { input: Record<string, unknown> }) => {
      if (tableName) {
        const row = await insertDynamicRow(tableName, colId, input);
        return flatRow(row);
      }
      const rec = await db.record.create({ data: { collectionId: colId, data: JSON.stringify(input) } });
      return flatLegacy(rec);
    };

    // Update
    resolvers.Mutation[`update_${col.name}`] = async (_: unknown, { id, input }: { id: string; input: Record<string, unknown> }) => {
      if (tableName) {
        const existing = await getDynamicRow(tableName, colId, id);
        if (!existing) return null;
        let prev: Record<string, unknown> = {};
        try { prev = JSON.parse(existing.data); } catch { /* empty */ }
        const row = await updateDynamicRow(tableName, colId, id, { ...prev, ...input });
        return flatRow(row);
      }
      const rec = await db.record.findFirst({ where: { id, collectionId: colId } });
      if (!rec) return null;
      let prev: Record<string, unknown> = {};
      try { prev = JSON.parse(rec.data); } catch { /* empty */ }
      const updated = await db.record.update({ where: { id }, data: { data: JSON.stringify({ ...prev, ...input }) } });
      return flatLegacy(updated);
    };

    // Delete
    resolvers.Mutation[`delete_${col.name}`] = async (_: unknown, { id }: { id: string }) => {
      try {
        if (tableName) { await deleteDynamicRow(tableName, id); return true; }
        await db.record.delete({ where: { id } });
        return true;
      } catch { return false; }
    };
  }

  const typeDefs = [
    ...typeBlocks,
    `type Query {\n${queryFields.join("\n")}\n}`,
    `type Mutation {\n${mutationFields.join("\n")}\n}`,
  ].join("\n\n");

  return { typeDefs, resolvers };
}

/* ── Row helpers ─────────────────────────────────────────── */
function flatRow(row: { id: string; data: string; createdAt: Date; updatedAt: Date }) {
  let fields: Record<string, unknown> = {};
  try { fields = JSON.parse(row.data); } catch { /* empty */ }
  return { id: row.id, createdAt: row.createdAt?.toISOString(), updatedAt: row.updatedAt?.toISOString(), ...fields };
}

function flatLegacy(rec: { id: string; data: string; createdAt: Date; updatedAt: Date }) {
  return flatRow(rec);
}

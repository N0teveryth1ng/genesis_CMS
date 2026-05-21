"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  addDynamicColumn,
  dropDynamicColumn,
  createJunctionTable,
  dropJunctionTable,
} from "@/lib/db-dynamic";

export type RelationWithCollections = Awaited<ReturnType<typeof getRelations>>[number];

/* ── List all relations for a collection (both sides) ──────── */
export async function getRelations(collectionId: string) {
  return db.relation.findMany({
    where: {
      OR: [
        { collectionId },
        { relatedCollectionId: collectionId },
      ],
    },
    include: {
      collection:        { select: { id: true, name: true, label: true, tableName: true } },
      relatedCollection: { select: { id: true, name: true, label: true, tableName: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

/* ── Create a relation ─────────────────────────────────────── */
export async function createRelation(input: {
  type:                "m2o" | "o2m" | "m2m";
  collectionId:        string;
  fieldName:           string;
  relatedCollectionId: string;
  relatedFieldName?:   string;
}) {
  const { type, collectionId, fieldName, relatedCollectionId } = input;
  const relatedFieldName = input.relatedFieldName ?? "id";

  const [col, relCol] = await Promise.all([
    db.collection.findUnique({ where: { id: collectionId } }),
    db.collection.findUnique({ where: { id: relatedCollectionId } }),
  ]);

  if (!col || !relCol) throw new Error("Collection not found");

  let junctionTable: string | undefined;

  if (type === "m2o") {
    // Add FK column to the owning (many) side
    if (col.tableName) {
      await addDynamicColumn(col.tableName, fieldName, "uuid");
    }
  } else if (type === "m2m") {
    // Create a junction table
    junctionTable = `genesis_jxn_${col.name}_${relCol.name}`;
    const colAField = `${col.name}_id`;
    const colBField = `${relCol.name}_id`;
    await createJunctionTable(junctionTable, colAField, colBField);
  }
  // o2m is purely virtual — no DDL needed

  const relation = await db.relation.create({
    data: {
      type,
      collectionId,
      fieldName,
      relatedCollectionId,
      relatedFieldName,
      junctionTable: junctionTable ?? null,
    },
  });

  revalidatePath(`/collections/${collectionId}`);
  return { ok: true, relation };
}

/* ── Delete a relation ─────────────────────────────────────── */
export async function deleteRelation(id: string) {
  const rel = await db.relation.findUnique({
    where: { id },
    include: {
      collection:        { select: { tableName: true } },
      relatedCollection: { select: { tableName: true } },
    },
  });
  if (!rel) throw new Error("Relation not found");

  if (rel.type === "m2o" && rel.collection.tableName) {
    await dropDynamicColumn(rel.collection.tableName, rel.fieldName).catch(() => {});
  }
  if (rel.type === "m2m" && rel.junctionTable) {
    await dropJunctionTable(rel.junctionTable).catch(() => {});
  }

  await db.relation.delete({ where: { id } });
  revalidatePath(`/collections/${rel.collectionId}`);
  return { ok: true };
}

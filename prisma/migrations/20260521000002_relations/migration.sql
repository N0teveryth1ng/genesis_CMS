-- Create Relation table for M2O / O2M / M2M relationship metadata
CREATE TABLE "Relation" (
  "id"                  TEXT        NOT NULL,
  "type"                TEXT        NOT NULL,
  "collectionId"        TEXT        NOT NULL,
  "fieldName"           TEXT        NOT NULL,
  "relatedCollectionId" TEXT        NOT NULL,
  "relatedFieldName"    TEXT        NOT NULL DEFAULT 'id',
  "junctionTable"       TEXT,
  "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "Relation_pkey"                   PRIMARY KEY ("id"),
  CONSTRAINT "Relation_collectionId_fieldName" UNIQUE ("collectionId", "fieldName"),
  CONSTRAINT "Relation_collectionId_fkey"        FOREIGN KEY ("collectionId")
    REFERENCES "Collection"("id") ON DELETE CASCADE,
  CONSTRAINT "Relation_relatedCollectionId_fkey" FOREIGN KEY ("relatedCollectionId")
    REFERENCES "Collection"("id") ON DELETE CASCADE
);

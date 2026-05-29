CREATE TABLE "Extension" (
  "id"           TEXT         PRIMARY KEY,
  "pluginId"     TEXT         NOT NULL,
  "active"       BOOLEAN      NOT NULL DEFAULT true,
  "config"       TEXT         NOT NULL DEFAULT '{}',
  "collectionId" TEXT,
  "events"       TEXT         NOT NULL DEFAULT 'create,update',
  "createdAt"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

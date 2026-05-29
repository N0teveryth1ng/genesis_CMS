CREATE TABLE "Flow" (
  "id"          TEXT         PRIMARY KEY,
  "name"        TEXT         NOT NULL,
  "description" TEXT,
  "active"      BOOLEAN      NOT NULL DEFAULT true,
  "trigger"     TEXT         NOT NULL,
  "steps"       TEXT         NOT NULL DEFAULT '[]',
  "runCount"    INTEGER      NOT NULL DEFAULT 0,
  "lastRunAt"   TIMESTAMPTZ,
  "createdAt"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE "FlowRun" (
  "id"        TEXT         PRIMARY KEY,
  "flowId"    TEXT         NOT NULL REFERENCES "Flow"("id") ON DELETE CASCADE,
  "status"    TEXT         NOT NULL,
  "log"       TEXT         NOT NULL DEFAULT '[]',
  "startedAt" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "endedAt"   TIMESTAMPTZ
);

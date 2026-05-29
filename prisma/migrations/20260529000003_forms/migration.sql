CREATE TABLE "FormSubmission" (
  "id"        TEXT NOT NULL,
  "pageId"    TEXT NOT NULL,
  "pageSlug"  TEXT NOT NULL,
  "blockId"   TEXT NOT NULL,
  "data"      TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);

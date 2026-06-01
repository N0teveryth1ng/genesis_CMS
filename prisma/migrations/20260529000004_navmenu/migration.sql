CREATE TABLE "NavMenu" (
  "id"        TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "items"     TEXT NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NavMenu_pkey" PRIMARY KEY ("id")
);

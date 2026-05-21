-- CreateTable
CREATE TABLE IF NOT EXISTS "GitIntegration" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "owner" TEXT NOT NULL DEFAULT '',
    "repo" TEXT NOT NULL DEFAULT '',
    "branch" TEXT NOT NULL DEFAULT 'main',
    "configPath" TEXT NOT NULL DEFAULT '.genesis/config.json',
    "accessToken" TEXT NOT NULL DEFAULT '',
    "webhookUrl" TEXT NOT NULL DEFAULT '',
    "webhookEnabled" BOOLEAN NOT NULL DEFAULT false,
    "webhookStatus" TEXT NOT NULL DEFAULT 'idle',
    "lastTriggered" TIMESTAMP(3),
    "sandboxStatus" TEXT NOT NULL DEFAULT 'idle',
    "sandboxPort" INTEGER NOT NULL DEFAULT 4000,
    "sandboxUrl" TEXT NOT NULL DEFAULT '',
    "sandboxLogs" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GitIntegration_pkey" PRIMARY KEY ("id")
);

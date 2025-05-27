-- CreateTable
CREATE TABLE "MSConfig" (
    "id" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB NOT NULL,

    CONSTRAINT "MSConfig_pkey" PRIMARY KEY ("id")
);

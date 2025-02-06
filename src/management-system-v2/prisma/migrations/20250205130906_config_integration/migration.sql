-- CreateTable
CREATE TABLE "config" (
    "id" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigParameter" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "ConfigParameter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigParameterContent" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "ConfigParameterContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineConfig" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "MachineConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TargetConfig" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "TargetConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigVersions" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "ConfigVersions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "config" ADD CONSTRAINT "config_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config" ADD CONSTRAINT "config_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

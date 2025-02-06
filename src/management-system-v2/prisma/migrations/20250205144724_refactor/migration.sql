/*
  Warnings:

  - You are about to drop the `ConfigParameter` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ConfigParameterContent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ConfigVersions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MachineConfig` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TargetConfig` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "ConfigParameter";

-- DropTable
DROP TABLE "ConfigParameterContent";

-- DropTable
DROP TABLE "ConfigVersions";

-- DropTable
DROP TABLE "MachineConfig";

-- DropTable
DROP TABLE "TargetConfig";

-- CreateTable
CREATE TABLE "config_parameter" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "config_parameter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machine_config" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "machine_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "target_config" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "target_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_version" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "config_version_pkey" PRIMARY KEY ("id")
);

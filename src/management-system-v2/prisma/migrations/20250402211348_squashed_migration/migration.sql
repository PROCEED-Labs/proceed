/*
  Warnings:

  - A unique constraint covering the columns `[name,environmentId,creatorId,folderId]` on the table `process` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "process" ADD COLUMN     "userDefinedId" TEXT;

-- CreateTable
CREATE TABLE "config" (
    "id" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "createdOn" TIMESTAMP(3) NOT NULL,
    "lastEditedOn" TIMESTAMP(3) NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "config_pkey" PRIMARY KEY ("id")
);

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
    "parentId" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "config_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_categories" (
    "id" TEXT NOT NULL,
    "categories" TEXT[],

    CONSTRAINT "config_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "process_name_environmentId_creatorId_folderId_key" ON "process"("name", "environmentId", "creatorId", "folderId");

-- AddForeignKey
ALTER TABLE "config" ADD CONSTRAINT "config_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config" ADD CONSTRAINT "config_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

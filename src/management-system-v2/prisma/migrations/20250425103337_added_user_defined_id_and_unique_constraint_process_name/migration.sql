/*
  Warnings:

  - A unique constraint covering the columns `[name,environmentId,creatorId,folderId]` on the table `process` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "process" ADD COLUMN     "userDefinedId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "process_name_environmentId_creatorId_folderId_key" ON "process"("name", "environmentId", "creatorId", "folderId");

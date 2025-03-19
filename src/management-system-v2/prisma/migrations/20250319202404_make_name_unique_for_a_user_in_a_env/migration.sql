/*
  Warnings:

  - A unique constraint covering the columns `[name,environmentId,creatorId]` on the table `process` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "process_userDefinedId_key";

-- CreateIndex
CREATE UNIQUE INDEX "process_name_environmentId_creatorId_key" ON "process"("name", "environmentId", "creatorId");

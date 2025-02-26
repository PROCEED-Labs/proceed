/*
  Warnings:

  - A unique constraint covering the columns `[userDefinedId]` on the table `process` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "process" ADD COLUMN     "userDefinedId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "process_userDefinedId_key" ON "process"("userDefinedId");

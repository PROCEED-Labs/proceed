/*
  Warnings:

  - Added the required column `originalId` to the `Process` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `shareTimestamp` on the `Process` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `allowIframeTimestamp` on the `Process` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Process" ADD COLUMN     "originalId" TEXT NOT NULL,
DROP COLUMN "shareTimestamp",
ADD COLUMN     "shareTimestamp" INTEGER NOT NULL,
DROP COLUMN "allowIframeTimestamp",
ADD COLUMN     "allowIframeTimestamp" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "processId" TEXT NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Variable" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "processId" TEXT NOT NULL,

    CONSTRAINT "Variable_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variable" ADD CONSTRAINT "Variable_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

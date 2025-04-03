/*
  Warnings:

  - You are about to drop the column `templateProcessId` on the `artifact_process_reference` table. All the data in the column will be lost.
  - You are about to drop the column `templateProcessId` on the `version` table. All the data in the column will be lost.
  - You are about to drop the `templateProcess` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `category` to the `folder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `isTemplate` to the `process` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "artifact_process_reference" DROP CONSTRAINT "artifact_process_reference_templateProcessId_fkey";

-- DropForeignKey
ALTER TABLE "templateProcess" DROP CONSTRAINT "templateProcess_creatorId_fkey";

-- DropForeignKey
ALTER TABLE "templateProcess" DROP CONSTRAINT "templateProcess_environmentId_fkey";

-- DropForeignKey
ALTER TABLE "templateProcess" DROP CONSTRAINT "templateProcess_folderId_fkey";

-- DropForeignKey
ALTER TABLE "version" DROP CONSTRAINT "version_templateProcessId_fkey";

-- AlterTable
ALTER TABLE "artifact_process_reference" DROP COLUMN "templateProcessId";

-- AlterTable
ALTER TABLE "folder" ADD COLUMN     "category" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "process" ADD COLUMN     "isTemplate" BOOLEAN NOT NULL;

-- AlterTable
ALTER TABLE "version" DROP COLUMN "templateProcessId";

-- DropTable
DROP TABLE "templateProcess";

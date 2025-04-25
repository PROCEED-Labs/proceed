/*
  Warnings:

  - Added the required column `category` to the `folder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `isTemplate` to the `process` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "artifact_process_reference" ALTER COLUMN "processId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "folder" ADD COLUMN     "category" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "process" ADD COLUMN     "basedOnTemplateId" TEXT,
ADD COLUMN     "basedOnTemplateVersion" TEXT,
ADD COLUMN     "isTemplate" BOOLEAN NOT NULL;

-- AlterTable
ALTER TABLE "version" ALTER COLUMN "processId" DROP NOT NULL;

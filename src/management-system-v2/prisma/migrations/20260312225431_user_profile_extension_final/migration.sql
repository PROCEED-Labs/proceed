/*
  Warnings:

  - You are about to drop the column `type` on the `role` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "role" DROP COLUMN "type",
ADD COLUMN     "organizationRoleType" TEXT[] DEFAULT ARRAY[]::TEXT[];

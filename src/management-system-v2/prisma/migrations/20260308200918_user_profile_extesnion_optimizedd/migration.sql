/*
  Warnings:

  - You are about to drop the column `backOfficeRoleId` on the `user_organigram` table. All the data in the column will be lost.
  - You are about to drop the column `teamRoleId` on the `user_organigram` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "user_organigram" DROP CONSTRAINT "user_organigram_backOfficeRoleId_fkey";

-- DropForeignKey
ALTER TABLE "user_organigram" DROP CONSTRAINT "user_organigram_teamRoleId_fkey";

-- AlterTable
ALTER TABLE "user_organigram" DROP COLUMN "backOfficeRoleId",
DROP COLUMN "teamRoleId";

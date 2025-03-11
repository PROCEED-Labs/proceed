/*
  Warnings:

  - Added the required column `parentId` to the `config_version` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "config_version" ADD COLUMN     "parentId" TEXT NOT NULL;

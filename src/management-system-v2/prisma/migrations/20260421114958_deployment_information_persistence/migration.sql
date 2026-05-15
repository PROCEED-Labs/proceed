/*
  Warnings:

  - Added the required column `mimeType` to the `artiface_instance_reference` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "artiface_instance_reference" ADD COLUMN     "mimeType" TEXT NOT NULL;

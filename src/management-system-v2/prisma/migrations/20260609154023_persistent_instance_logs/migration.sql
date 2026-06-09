/*
  Warnings:

  - Added the required column `logs` to the `process_instance` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "process_instance" ADD COLUMN     "logs" JSONB NOT NULL;

/*
  Warnings:

  - Added the required column `configuration` to the `engine` table without a default value. This is not possible if the table is not empty.
  - Added the required column `data` to the `engine` table without a default value. This is not possible if the table is not empty.
  - Added the required column `logs` to the `engine` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "engine" ADD COLUMN     "configuration" JSONB NOT NULL,
ADD COLUMN     "data" JSONB NOT NULL,
ADD COLUMN     "logs" JSONB NOT NULL;

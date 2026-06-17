/*
  Warnings:

  - Added the required column `reachable` to the `ConnectionEngineReachability` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ConnectionEngineReachability" ADD COLUMN     "lastContact" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "reachable" BOOLEAN NOT NULL;

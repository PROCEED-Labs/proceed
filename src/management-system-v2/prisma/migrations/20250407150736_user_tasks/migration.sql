/*
  Warnings:

  - Added the required column `state` to the `userTask` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "userTask" ADD COLUMN     "state" TEXT NOT NULL;

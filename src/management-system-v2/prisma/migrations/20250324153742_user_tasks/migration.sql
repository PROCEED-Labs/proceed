/*
  Warnings:

  - You are about to drop the column `initialMilestoneData` on the `userTask` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "userTask" DROP COLUMN "initialMilestoneData",
ADD COLUMN     "milestonesChanges" JSONB;

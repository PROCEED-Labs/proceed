/*
  Warnings:

  - Made the column `initialVariables` on table `userTask` required. This step will fail if there are existing NULL values in that column.
  - Made the column `variableChanges` on table `userTask` required. This step will fail if there are existing NULL values in that column.
  - Made the column `milestones` on table `userTask` required. This step will fail if there are existing NULL values in that column.
  - Made the column `milestonesChanges` on table `userTask` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "userTask" ALTER COLUMN "initialVariables" SET NOT NULL,
ALTER COLUMN "variableChanges" SET NOT NULL,
ALTER COLUMN "milestones" SET NOT NULL,
ALTER COLUMN "milestonesChanges" SET NOT NULL;

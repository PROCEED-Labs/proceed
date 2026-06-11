/*
  Warnings:

  - Added the required column `environmentId` to the `userTask` table without a default value. This is not possible if the table is not empty.
  - Made the column `html` on table `userTask` required. This step will fail if there are existing NULL values in that column.
  - Made the column `initialVariables` on table `userTask` required. This step will fail if there are existing NULL values in that column.
  - Made the column `variableChanges` on table `userTask` required. This step will fail if there are existing NULL values in that column.
  - Made the column `milestones` on table `userTask` required. This step will fail if there are existing NULL values in that column.
  - Made the column `milestonesChanges` on table `userTask` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "userTask" ADD COLUMN     "environmentId" TEXT NOT NULL,
ALTER COLUMN "instanceID" DROP NOT NULL,
ALTER COLUMN "html" SET NOT NULL,
ALTER COLUMN "initialVariables" SET NOT NULL,
ALTER COLUMN "variableChanges" SET NOT NULL,
ALTER COLUMN "milestones" SET NOT NULL,
ALTER COLUMN "milestonesChanges" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "userTask" ADD CONSTRAINT "userTask_instanceID_fkey" FOREIGN KEY ("instanceID") REFERENCES "process_instance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userTask" ADD CONSTRAINT "userTask_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

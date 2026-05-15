/*
  Warnings:

  - Added the required column `environmentId` to the `userTask` table without a default value. This is not possible if the table is not empty.
  - Made the column `html` on table `userTask` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "userTask" ADD COLUMN     "environmentId" TEXT NOT NULL,
ALTER COLUMN "html" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "userTask" ADD CONSTRAINT "userTask_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

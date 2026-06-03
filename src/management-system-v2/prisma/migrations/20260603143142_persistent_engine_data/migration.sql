/*
  Warnings:

  - You are about to drop the column `engineIds` on the `process_instance` table. All the data in the column will be lost.
  - You are about to drop the column `machineId` on the `userTask` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "process_instance" DROP COLUMN "engineIds";

-- AlterTable
ALTER TABLE "userTask" DROP COLUMN "machineId",
ADD COLUMN     "engineId" TEXT;

-- CreateTable
CREATE TABLE "engine" (
    "id" TEXT NOT NULL,
    "name" TEXT,

    CONSTRAINT "engine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_EngineToEngineConnection" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EngineToEngineConnection_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_EngineToProcessInstance" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EngineToProcessInstance_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_EngineToEngineConnection_B_index" ON "_EngineToEngineConnection"("B");

-- CreateIndex
CREATE INDEX "_EngineToProcessInstance_B_index" ON "_EngineToProcessInstance"("B");

-- AddForeignKey
ALTER TABLE "userTask" ADD CONSTRAINT "userTask_engineId_fkey" FOREIGN KEY ("engineId") REFERENCES "engine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_deployment" ADD CONSTRAINT "process_deployment_engineId_fkey" FOREIGN KEY ("engineId") REFERENCES "engine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EngineToEngineConnection" ADD CONSTRAINT "_EngineToEngineConnection_A_fkey" FOREIGN KEY ("A") REFERENCES "engine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EngineToEngineConnection" ADD CONSTRAINT "_EngineToEngineConnection_B_fkey" FOREIGN KEY ("B") REFERENCES "engine-connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EngineToProcessInstance" ADD CONSTRAINT "_EngineToProcessInstance_A_fkey" FOREIGN KEY ("A") REFERENCES "engine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EngineToProcessInstance" ADD CONSTRAINT "_EngineToProcessInstance_B_fkey" FOREIGN KEY ("B") REFERENCES "process_instance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

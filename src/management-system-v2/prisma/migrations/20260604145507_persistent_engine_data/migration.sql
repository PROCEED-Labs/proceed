/*
  Warnings:

  - You are about to drop the `_EngineToEngineConnection` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_EngineToEngineConnection" DROP CONSTRAINT "_EngineToEngineConnection_A_fkey";

-- DropForeignKey
ALTER TABLE "_EngineToEngineConnection" DROP CONSTRAINT "_EngineToEngineConnection_B_fkey";

-- DropTable
DROP TABLE "_EngineToEngineConnection";

-- CreateTable
CREATE TABLE "ConnectionEngineReachability" (
    "engineId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "reachable" BOOLEAN NOT NULL,

    CONSTRAINT "ConnectionEngineReachability_pkey" PRIMARY KEY ("engineId","connectionId")
);

-- AddForeignKey
ALTER TABLE "ConnectionEngineReachability" ADD CONSTRAINT "ConnectionEngineReachability_engineId_fkey" FOREIGN KEY ("engineId") REFERENCES "engine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectionEngineReachability" ADD CONSTRAINT "ConnectionEngineReachability_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "engine-connection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

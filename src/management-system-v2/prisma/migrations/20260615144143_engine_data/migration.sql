-- AlterTable
ALTER TABLE "engine-connection" ADD COLUMN     "removed" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "engine" (
    "id" TEXT NOT NULL,
    "name" TEXT,

    CONSTRAINT "engine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectionEngineReachability" (
    "engineId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,

    CONSTRAINT "ConnectionEngineReachability_pkey" PRIMARY KEY ("engineId","connectionId")
);

-- AddForeignKey
ALTER TABLE "ConnectionEngineReachability" ADD CONSTRAINT "ConnectionEngineReachability_engineId_fkey" FOREIGN KEY ("engineId") REFERENCES "engine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectionEngineReachability" ADD CONSTRAINT "ConnectionEngineReachability_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "engine-connection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "process_deployment" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "deployerId" TEXT NOT NULL,
    "deployTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removeTime" TIMESTAMP(3),
    "engineId" TEXT NOT NULL,

    CONSTRAINT "process_deployment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "process_deployment" ADD CONSTRAINT "process_deployment_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_deployment" ADD CONSTRAINT "process_deployment_deployerId_fkey" FOREIGN KEY ("deployerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

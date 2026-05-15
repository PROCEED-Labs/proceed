-- DropForeignKey
ALTER TABLE "process" DROP CONSTRAINT "process_folderId_fkey";

-- AlterTable
ALTER TABLE "process" ALTER COLUMN "folderId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "userTask" ALTER COLUMN "instanceID" DROP NOT NULL;

-- CreateTable
CREATE TABLE "process_deployment" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "machineIds" TEXT[],
    "deployerId" TEXT NOT NULL,
    "deployTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "process_deployment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "process_instance" (
    "id" TEXT NOT NULL,
    "deploymentId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "machineIds" TEXT[],
    "state" JSONB NOT NULL,

    CONSTRAINT "process_instance_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "process" ADD CONSTRAINT "process_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userTask" ADD CONSTRAINT "userTask_instanceID_fkey" FOREIGN KEY ("instanceID") REFERENCES "process_instance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_deployment" ADD CONSTRAINT "process_deployment_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_deployment" ADD CONSTRAINT "process_deployment_deployerId_fkey" FOREIGN KEY ("deployerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_instance" ADD CONSTRAINT "process_instance_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "process_deployment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_instance" ADD CONSTRAINT "process_instance_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_instance" ADD CONSTRAINT "process_instance_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

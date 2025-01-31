-- AlterTable
ALTER TABLE "artifact_process_reference" ADD COLUMN     "templateProcessId" TEXT,
ALTER COLUMN "processId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "process" ADD COLUMN     "basedOnTemplateId" TEXT,
ADD COLUMN     "basedOnTemplateVersion" TEXT;

-- AlterTable
ALTER TABLE "version" ADD COLUMN     "templateProcessId" TEXT,
ALTER COLUMN "processId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "templateProcess" (
    "id" TEXT NOT NULL,
    "originalId" TEXT NOT NULL,
    "basedOnTemplateId" TEXT,
    "basedOnTemplateVersion" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdOn" TIMESTAMP(3) NOT NULL,
    "lastEditedOn" TIMESTAMP(3) NOT NULL,
    "inEditingBy" JSONB,
    "processIds" TEXT[],
    "type" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "sharedAs" TEXT NOT NULL,
    "shareTimestamp" BIGINT NOT NULL,
    "allowIframeTimestamp" BIGINT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "bpmn" XML NOT NULL,
    "creatorId" TEXT NOT NULL,

    CONSTRAINT "templateProcess_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "templateProcess" ADD CONSTRAINT "templateProcess_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templateProcess" ADD CONSTRAINT "templateProcess_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templateProcess" ADD CONSTRAINT "templateProcess_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifact_process_reference" ADD CONSTRAINT "artifact_process_reference_templateProcessId_fkey" FOREIGN KEY ("templateProcessId") REFERENCES "templateProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "version" ADD CONSTRAINT "version_templateProcessId_fkey" FOREIGN KEY ("templateProcessId") REFERENCES "templateProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

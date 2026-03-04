-- AlterTable
ALTER TABLE "userTask" ALTER COLUMN "instanceID" DROP NOT NULL;

-- CreateTable
CREATE TABLE "process-instance" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "initiatorSpaceId" TEXT NOT NULL,

    CONSTRAINT "process-instance_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "process-instance" ADD CONSTRAINT "process-instance_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process-instance" ADD CONSTRAINT "process-instance_initiatorSpaceId_fkey" FOREIGN KEY ("initiatorSpaceId") REFERENCES "space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userTask" ADD CONSTRAINT "userTask_instanceID_fkey" FOREIGN KEY ("instanceID") REFERENCES "process-instance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

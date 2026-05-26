-- CreateTable
CREATE TABLE "process_instance" (
    "id" TEXT NOT NULL,
    "deploymentId" TEXT NOT NULL,
    "initiatorId" TEXT,
    "engineIds" TEXT[],
    "state" JSONB NOT NULL,

    CONSTRAINT "process_instance_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "process_instance" ADD CONSTRAINT "process_instance_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "process_deployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_instance" ADD CONSTRAINT "process_instance_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "process_instance" DROP CONSTRAINT "process_instance_deploymentId_fkey";

-- AddForeignKey
ALTER TABLE "process_instance" ADD CONSTRAINT "process_instance_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "process_deployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

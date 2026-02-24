-- DropForeignKey
ALTER TABLE "config" DROP CONSTRAINT "config_creatorId_fkey";

-- DropForeignKey
ALTER TABLE "config" DROP CONSTRAINT "config_environmentId_fkey";

-- DropForeignKey
ALTER TABLE "config_machine_version" DROP CONSTRAINT "config_machine_version_configId_fkey";

-- DropForeignKey
ALTER TABLE "config_version" DROP CONSTRAINT "config_version_configId_fkey";

-- AddForeignKey
ALTER TABLE "config" ADD CONSTRAINT "config_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "space"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config" ADD CONSTRAINT "config_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_version" ADD CONSTRAINT "config_version_configId_fkey" FOREIGN KEY ("configId") REFERENCES "config"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_machine_version" ADD CONSTRAINT "config_machine_version_configId_fkey" FOREIGN KEY ("configId") REFERENCES "config"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

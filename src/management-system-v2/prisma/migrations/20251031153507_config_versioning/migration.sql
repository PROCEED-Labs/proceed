/*
  Warnings:

  - The primary key for the `config_version` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `data` on the `config_version` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `config_version` table. All the data in the column will be lost.
  - You are about to drop the column `parentId` on the `config_version` table. All the data in the column will be lost.
  - Added the required column `configId` to the `config_version` table without a default value. This is not possible if the table is not empty.
  - Added the required column `machineDatasets` to the `config_version` table without a default value. This is not possible if the table is not empty.
  - Added the required column `versionData` to the `config_version` table without a default value. This is not possible if the table is not empty.
  - Added the required column `versionNo` to the `config_version` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "config_version" DROP CONSTRAINT "config_version_pkey",
DROP COLUMN "data",
DROP COLUMN "id",
DROP COLUMN "parentId",
ADD COLUMN     "configId" TEXT NOT NULL,
ADD COLUMN     "machineDatasets" JSONB NOT NULL,
ADD COLUMN     "versionData" JSONB NOT NULL,
ADD COLUMN     "versionNo" TEXT NOT NULL,
ADD CONSTRAINT "config_version_pkey" PRIMARY KEY ("configId", "versionNo");

-- CreateTable
CREATE TABLE "config_machine_version" (
    "machineId" TEXT NOT NULL,
    "versionNo" TEXT NOT NULL,
    "structureNo" TEXT NOT NULL,
    "updateNo" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "acknowledged" BOOLEAN NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "config_machine_version_pkey" PRIMARY KEY ("machineId","versionNo","structureNo","updateNo")
);

-- AddForeignKey
ALTER TABLE "config_version" ADD CONSTRAINT "config_version_configId_fkey" FOREIGN KEY ("configId") REFERENCES "config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_machine_version" ADD CONSTRAINT "config_machine_version_configId_fkey" FOREIGN KEY ("configId") REFERENCES "config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

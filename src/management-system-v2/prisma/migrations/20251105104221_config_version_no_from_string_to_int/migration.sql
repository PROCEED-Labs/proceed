/*
  Warnings:

  - The primary key for the `config_machine_version` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `config_version` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `versionNo` on the `config_machine_version` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `structureNo` on the `config_machine_version` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `updateNo` on the `config_machine_version` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `versionNo` on the `config_version` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "config_machine_version" DROP CONSTRAINT "config_machine_version_pkey",
DROP COLUMN "versionNo",
ADD COLUMN     "versionNo" INTEGER NOT NULL,
DROP COLUMN "structureNo",
ADD COLUMN     "structureNo" INTEGER NOT NULL,
DROP COLUMN "updateNo",
ADD COLUMN     "updateNo" INTEGER NOT NULL,
ADD CONSTRAINT "config_machine_version_pkey" PRIMARY KEY ("machineId", "versionNo", "structureNo", "updateNo");

-- AlterTable
ALTER TABLE "config_version" DROP CONSTRAINT "config_version_pkey",
DROP COLUMN "versionNo",
ADD COLUMN     "versionNo" INTEGER NOT NULL,
ADD CONSTRAINT "config_version_pkey" PRIMARY KEY ("configId", "versionNo");

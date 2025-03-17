/*
  Warnings:

  - The primary key for the `config_categories` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `environmentId` on the `config_categories` table. All the data in the column will be lost.
  - The required column `id` was added to the `config_categories` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "config_categories" DROP CONSTRAINT "config_categories_pkey",
DROP COLUMN "environmentId",
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "config_categories_pkey" PRIMARY KEY ("id");

/*
  Warnings:

  - You are about to drop the `ConfigCategories` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "ConfigCategories";

-- CreateTable
CREATE TABLE "config_categories" (
    "environmentId" TEXT NOT NULL,
    "categories" TEXT[],

    CONSTRAINT "config_categories_pkey" PRIMARY KEY ("environmentId")
);

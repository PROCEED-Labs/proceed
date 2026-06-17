/*
  Warnings:

  - You are about to drop the `engine` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "engine" DROP CONSTRAINT "engine_environmentId_fkey";

-- DropTable
DROP TABLE "engine";

-- CreateTable
CREATE TABLE "engine-connection" (
    "id" TEXT NOT NULL,
    "environmentId" TEXT,
    "address" TEXT NOT NULL,
    "name" TEXT,
    "createdOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastEditedOn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "engine-connection_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "engine-connection" ADD CONSTRAINT "engine-connection_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

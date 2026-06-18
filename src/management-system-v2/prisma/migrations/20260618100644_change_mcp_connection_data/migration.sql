/*
  Warnings:

  - The primary key for the `McpPairingCode` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `codeHash` on the `McpPairingCode` table. All the data in the column will be lost.
  - Added the required column `code` to the `McpPairingCode` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "McpPairingCode" DROP CONSTRAINT "McpPairingCode_userId_fkey";

-- AlterTable
ALTER TABLE "McpPairingCode" DROP CONSTRAINT "McpPairingCode_pkey",
DROP COLUMN "codeHash",
ADD COLUMN     "code" TEXT NOT NULL,
ADD CONSTRAINT "McpPairingCode_pkey" PRIMARY KEY ("code");

-- AddForeignKey
ALTER TABLE "McpPairingCode" ADD CONSTRAINT "McpPairingCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

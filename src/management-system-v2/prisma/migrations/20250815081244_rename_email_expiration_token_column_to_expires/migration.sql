/*
  Warnings:

  - You are about to drop the column `expiresAt` on the `EmailVerificationToken` table. All the data in the column will be lost.
  - Added the required column `expires` to the `EmailVerificationToken` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EmailVerificationToken" DROP COLUMN "expiresAt",
ADD COLUMN     "expires" TIMESTAMP(3) NOT NULL;

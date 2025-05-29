/*
  Warnings:

  - You are about to drop the column `logo` on the `space` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "space" DROP COLUMN "logo",
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "spaceLogo" TEXT;

-- AlterTable
ALTER TABLE "user" DROP COLUMN "image",
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "profileImage" TEXT;

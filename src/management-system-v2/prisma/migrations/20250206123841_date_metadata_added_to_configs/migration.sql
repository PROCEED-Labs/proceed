/*
  Warnings:

  - Added the required column `createdOn` to the `config` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastEditedOn` to the `config` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "config" ADD COLUMN     "createdOn" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "lastEditedOn" TIMESTAMP(3) NOT NULL;

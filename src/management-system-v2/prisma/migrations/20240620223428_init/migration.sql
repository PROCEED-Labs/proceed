/*
  Warnings:

  - You are about to drop the column `parentFolderId` on the `Folder` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Folder` table. All the data in the column will be lost.
  - You are about to drop the column `workspaceId` on the `Folder` table. All the data in the column will be lost.
  - You are about to drop the column `lastEdited` on the `Process` table. All the data in the column will be lost.
  - You are about to drop the column `workspaceId` on the `Process` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Role` table. All the data in the column will be lost.
  - You are about to drop the column `workspaceId` on the `Role` table. All the data in the column will be lost.
  - You are about to drop the column `emailVerified` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `guest` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `organisation` on the `Workspace` table. All the data in the column will be lost.
  - You are about to drop the `Department` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProcessBPMN` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Variable` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_WorkspaceMember` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `createdOn` to the `Folder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `environmentId` to the `Folder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastEditedOn` to the `Folder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bpmn` to the `Process` table without a default value. This is not possible if the table is not empty.
  - Added the required column `environmentId` to the `Process` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastEditedOn` to the `Process` table without a default value. This is not possible if the table is not empty.
  - Made the column `ownerId` on table `Process` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `createdOn` to the `Role` table without a default value. This is not possible if the table is not empty.
  - Added the required column `environmentId` to the `Role` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastEdited` to the `Role` table without a default value. This is not possible if the table is not empty.
  - Added the required column `permissions` to the `Role` table without a default value. This is not possible if the table is not empty.
  - Added the required column `isGuest` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdOn` to the `Version` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastEditedOn` to the `Version` table without a default value. This is not possible if the table is not empty.
  - Added the required column `version` to the `Version` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organization` to the `Workspace` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Department" DROP CONSTRAINT "Department_processId_fkey";

-- DropForeignKey
ALTER TABLE "Folder" DROP CONSTRAINT "Folder_parentFolderId_fkey";

-- DropForeignKey
ALTER TABLE "Folder" DROP CONSTRAINT "Folder_userId_fkey";

-- DropForeignKey
ALTER TABLE "Folder" DROP CONSTRAINT "Folder_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "Process" DROP CONSTRAINT "Process_folderId_fkey";

-- DropForeignKey
ALTER TABLE "Process" DROP CONSTRAINT "Process_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "Process" DROP CONSTRAINT "Process_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "ProcessBPMN" DROP CONSTRAINT "ProcessBPMN_processId_fkey";

-- DropForeignKey
ALTER TABLE "Role" DROP CONSTRAINT "Role_userId_fkey";

-- DropForeignKey
ALTER TABLE "Role" DROP CONSTRAINT "Role_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "Variable" DROP CONSTRAINT "Variable_processId_fkey";

-- DropForeignKey
ALTER TABLE "Version" DROP CONSTRAINT "Version_processId_fkey";

-- DropForeignKey
ALTER TABLE "Workspace" DROP CONSTRAINT "Workspace_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "_WorkspaceMember" DROP CONSTRAINT "_WorkspaceMember_A_fkey";

-- DropForeignKey
ALTER TABLE "_WorkspaceMember" DROP CONSTRAINT "_WorkspaceMember_B_fkey";

-- AlterTable
ALTER TABLE "Folder" DROP COLUMN "parentFolderId",
DROP COLUMN "userId",
DROP COLUMN "workspaceId",
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "createdOn" TEXT NOT NULL,
ADD COLUMN     "environmentId" TEXT NOT NULL,
ADD COLUMN     "lastEditedOn" TEXT NOT NULL,
ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'folder';

-- AlterTable
ALTER TABLE "Process" DROP COLUMN "lastEdited",
DROP COLUMN "workspaceId",
ADD COLUMN     "bpmn" XML NOT NULL,
ADD COLUMN     "departments" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "environmentId" TEXT NOT NULL,
ADD COLUMN     "inEditingBy" JSONB,
ADD COLUMN     "lastEditedOn" TEXT NOT NULL,
ADD COLUMN     "processIds" TEXT[],
ADD COLUMN     "variables" JSONB[] DEFAULT ARRAY[]::JSONB[],
ALTER COLUMN "createdOn" SET DATA TYPE TEXT,
ALTER COLUMN "ownerId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Role" DROP COLUMN "userId",
DROP COLUMN "workspaceId",
ADD COLUMN     "createdOn" TEXT NOT NULL,
ADD COLUMN     "default" BOOLEAN,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "environmentId" TEXT NOT NULL,
ADD COLUMN     "expiration" TEXT,
ADD COLUMN     "lastEdited" TEXT NOT NULL,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "permissions" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "emailVerified",
DROP COLUMN "guest",
ADD COLUMN     "emailVerifiedOn" TEXT,
ADD COLUMN     "favourites" TEXT[],
ADD COLUMN     "image" TEXT,
ADD COLUMN     "isGuest" BOOLEAN NOT NULL,
ALTER COLUMN "firstName" DROP NOT NULL,
ALTER COLUMN "lastName" DROP NOT NULL,
ALTER COLUMN "username" DROP NOT NULL,
ALTER COLUMN "email" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Version" ADD COLUMN     "createdOn" TEXT NOT NULL,
ADD COLUMN     "lastEditedOn" TEXT NOT NULL,
ADD COLUMN     "version" INTEGER NOT NULL,
ADD COLUMN     "versionBasedOn" INTEGER;

-- AlterTable
ALTER TABLE "Workspace" DROP COLUMN "organisation",
ADD COLUMN     "contactPhoneNumber" TEXT,
ADD COLUMN     "isActive" BOOLEAN,
ADD COLUMN     "organization" BOOLEAN NOT NULL,
ALTER COLUMN "name" DROP NOT NULL,
ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "logo" DROP NOT NULL,
ALTER COLUMN "logo" SET DATA TYPE TEXT;

-- DropTable
DROP TABLE "Department";

-- DropTable
DROP TABLE "ProcessBPMN";

-- DropTable
DROP TABLE "Variable";

-- DropTable
DROP TABLE "_WorkspaceMember";

-- CreateTable
CREATE TABLE "OauthAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,

    CONSTRAINT "OauthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "createdOn" TEXT NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VersionBPMN" (
    "id" TEXT NOT NULL,
    "xml" XML NOT NULL,
    "versionId" TEXT NOT NULL,

    CONSTRAINT "VersionBPMN_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleMember" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdOn" TEXT NOT NULL,

    CONSTRAINT "RoleMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OauthAccount_provider_providerAccountId_key" ON "OauthAccount"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_environmentId_key" ON "Membership"("userId", "environmentId");

-- CreateIndex
CREATE UNIQUE INDEX "VersionBPMN_versionId_key" ON "VersionBPMN"("versionId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "OauthAccount" ADD CONSTRAINT "OauthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Process" ADD CONSTRAINT "Process_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Process" ADD CONSTRAINT "Process_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Process" ADD CONSTRAINT "Process_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Version" ADD CONSTRAINT "Version_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersionBPMN" ADD CONSTRAINT "VersionBPMN_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "Version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleMember" ADD CONSTRAINT "RoleMember_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleMember" ADD CONSTRAINT "RoleMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

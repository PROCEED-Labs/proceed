-- AlterTable
ALTER TABLE "role" ADD COLUMN     "parentId" TEXT;

-- AddForeignKey
ALTER TABLE "role" ADD CONSTRAINT "role_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

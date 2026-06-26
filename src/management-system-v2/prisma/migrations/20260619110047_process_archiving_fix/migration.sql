-- DropForeignKey
ALTER TABLE "process" DROP CONSTRAINT "process_folderId_fkey";

-- AddForeignKey
ALTER TABLE "process" ADD CONSTRAINT "process_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

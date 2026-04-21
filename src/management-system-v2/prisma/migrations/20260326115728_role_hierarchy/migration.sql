-- AlterTable
ALTER TABLE "role" ADD COLUMN     "parentRoleId" TEXT;

-- AddForeignKey
ALTER TABLE "role" ADD CONSTRAINT "role_parentRoleId_fkey" FOREIGN KEY ("parentRoleId") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

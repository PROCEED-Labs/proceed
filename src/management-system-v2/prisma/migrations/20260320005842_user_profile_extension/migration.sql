-- AlterTable
ALTER TABLE "role" ADD COLUMN     "organizationRoleType" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "user_organigram" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "directManagerId" TEXT,
    "teamRoleId" TEXT,
    "backOfficeRoleId" TEXT,

    CONSTRAINT "user_organigram_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_organigram_memberId_key" ON "user_organigram"("memberId");

-- AddForeignKey
ALTER TABLE "user_organigram" ADD CONSTRAINT "user_organigram_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_organigram" ADD CONSTRAINT "user_organigram_directManagerId_fkey" FOREIGN KEY ("directManagerId") REFERENCES "membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_organigram" ADD CONSTRAINT "user_organigram_teamRoleId_fkey" FOREIGN KEY ("teamRoleId") REFERENCES "role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_organigram" ADD CONSTRAINT "user_organigram_backOfficeRoleId_fkey" FOREIGN KEY ("backOfficeRoleId") REFERENCES "role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

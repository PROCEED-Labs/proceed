-- CreateTable
CREATE TABLE "user_organigram" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "teamRoleId" TEXT,
    "directManagerId" TEXT,
    "backOfficeRoleId" TEXT,

    CONSTRAINT "user_organigram_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_organigram_userId_environmentId_key" ON "user_organigram"("userId", "environmentId");

-- AddForeignKey
ALTER TABLE "user_organigram" ADD CONSTRAINT "user_organigram_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_organigram" ADD CONSTRAINT "user_organigram_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_organigram" ADD CONSTRAINT "user_organigram_teamRoleId_fkey" FOREIGN KEY ("teamRoleId") REFERENCES "role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_organigram" ADD CONSTRAINT "user_organigram_directManagerId_fkey" FOREIGN KEY ("directManagerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_organigram" ADD CONSTRAINT "user_organigram_backOfficeRoleId_fkey" FOREIGN KEY ("backOfficeRoleId") REFERENCES "role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

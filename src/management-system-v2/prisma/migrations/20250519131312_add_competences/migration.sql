-- CreateEnum
CREATE TYPE "CompetenceOwnerType" AS ENUM ('SPACE', 'USER');

-- CreateTable
CREATE TABLE "competence" (
    "id" TEXT NOT NULL,
    "type" "CompetenceOwnerType" NOT NULL,
    "spaceId" TEXT,
    "creatorUserId" TEXT,
    "name" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "externalQualificationNeeded" BOOLEAN NOT NULL DEFAULT false,
    "renewalTimeInterval" INTEGER,

    CONSTRAINT "competence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_competence" (
    "competenceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "proficiency" TEXT,
    "qualificationDate" TIMESTAMP(3),
    "lastUsage" TIMESTAMP(3),

    CONSTRAINT "user_competence_pkey" PRIMARY KEY ("competenceId","userId")
);

-- CreateIndex
CREATE INDEX "competence_spaceId_idx" ON "competence"("spaceId");

-- CreateIndex
CREATE INDEX "competence_creatorUserId_idx" ON "competence"("creatorUserId");

-- CreateIndex
CREATE INDEX "user_competence_competenceId_idx" ON "user_competence"("competenceId");

-- CreateIndex
CREATE INDEX "user_competence_userId_idx" ON "user_competence"("userId");

-- AddForeignKey
ALTER TABLE "competence" ADD CONSTRAINT "competence_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competence" ADD CONSTRAINT "competence_creatorUserId_fkey" FOREIGN KEY ("creatorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_competence" ADD CONSTRAINT "user_competence_competenceId_fkey" FOREIGN KEY ("competenceId") REFERENCES "competence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_competence" ADD CONSTRAINT "user_competence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

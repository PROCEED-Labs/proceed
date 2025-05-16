-- CreateEnum
CREATE TYPE "CompetenceAttributeType" AS ENUM ('PLAIN_TEXT', 'SHORT_TEXT');

-- CreateEnum
CREATE TYPE "CompetenceOwnerType" AS ENUM ('SPACE', 'USER');

-- CreateTable
CREATE TABLE "competence" (
    "id" TEXT NOT NULL,
    "ownerType" "CompetenceOwnerType" NOT NULL,
    "spaceId" TEXT,
    "userId" TEXT,

    CONSTRAINT "competence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competence_attribute" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "type" "CompetenceAttributeType" NOT NULL,
    "competenceId" TEXT NOT NULL,

    CONSTRAINT "competence_attribute_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "competence" ADD CONSTRAINT "competence_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competence" ADD CONSTRAINT "competence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competence_attribute" ADD CONSTRAINT "competence_attribute_competenceId_fkey" FOREIGN KEY ("competenceId") REFERENCES "competence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

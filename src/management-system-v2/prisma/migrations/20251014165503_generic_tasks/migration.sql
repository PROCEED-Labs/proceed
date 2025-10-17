-- CreateTable
CREATE TABLE "html-form" (
    "id" TEXT NOT NULL,
    "userDefinedId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdOn" TIMESTAMP(3) NOT NULL,
    "lastEditedOn" TIMESTAMP(3) NOT NULL,
    "environmentId" TEXT NOT NULL,
    "html" XML NOT NULL,
    "json" TEXT NOT NULL,
    "milestones" TEXT NOT NULL DEFAULT '[]',
    "variables" TEXT NOT NULL DEFAULT '[]',
    "creatorId" TEXT NOT NULL,

    CONSTRAINT "html-form_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "html-form_name_environmentId_creatorId_key" ON "html-form"("name", "environmentId", "creatorId");

-- AddForeignKey
ALTER TABLE "html-form" ADD CONSTRAINT "html-form_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "html-form" ADD CONSTRAINT "html-form_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

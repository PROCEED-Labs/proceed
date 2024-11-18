-- CreateTable
CREATE TABLE "Engine" (
    "id" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "createdOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastEditedOn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Engine_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Engine" ADD CONSTRAINT "Engine_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

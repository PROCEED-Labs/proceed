-- CreateTable
CREATE TABLE "engine" (
    "id" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "name" TEXT,
    "createdOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastEditedOn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "engine_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "engine" ADD CONSTRAINT "engine_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

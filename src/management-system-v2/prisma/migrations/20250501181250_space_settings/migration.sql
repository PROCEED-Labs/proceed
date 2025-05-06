-- CreateTable
CREATE TABLE "space_settings" (
    "id" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "settings" JSONB NOT NULL,

    CONSTRAINT "space_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "space_settings_environmentId_key" ON "space_settings"("environmentId");

-- AddForeignKey
ALTER TABLE "space_settings" ADD CONSTRAINT "space_settings_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

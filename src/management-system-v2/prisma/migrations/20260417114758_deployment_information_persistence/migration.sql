-- CreateTable
CREATE TABLE "artiface_instance_reference" (
    "id" TEXT NOT NULL,
    "artifactId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "originalName" TEXT NOT NULL,

    CONSTRAINT "artiface_instance_reference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "artiface_instance_reference_artifactId_instanceId_key" ON "artiface_instance_reference"("artifactId", "instanceId");

-- AddForeignKey
ALTER TABLE "artiface_instance_reference" ADD CONSTRAINT "artiface_instance_reference_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "artifact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artiface_instance_reference" ADD CONSTRAINT "artiface_instance_reference_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "process_instance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

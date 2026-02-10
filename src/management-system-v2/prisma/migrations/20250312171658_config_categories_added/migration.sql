-- CreateTable
CREATE TABLE "ConfigCategories" (
    "environmentId" TEXT NOT NULL,
    "categories" TEXT[],

    CONSTRAINT "ConfigCategories_pkey" PRIMARY KEY ("environmentId")
);

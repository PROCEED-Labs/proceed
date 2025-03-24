-- CreateTable
CREATE TABLE "password_account" (
    "userId" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "password_account_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "password_account" ADD CONSTRAINT "password_account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

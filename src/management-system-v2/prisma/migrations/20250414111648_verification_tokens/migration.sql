-- CreateTable
CREATE TABLE "VerificationToken" (
    "token" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("token")
);

-- AddForeignKey
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

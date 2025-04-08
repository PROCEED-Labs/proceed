-- CreateTable
CREATE TABLE "guest_signin" (
    "userId" TEXT NOT NULL,
    "lastSigninAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_signin_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "guest_signin" ADD CONSTRAINT "guest_signin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

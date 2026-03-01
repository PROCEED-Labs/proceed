-- CreateTable
CREATE TABLE "McpPairingCode" (
    "codeHash" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,

    CONSTRAINT "McpPairingCode_pkey" PRIMARY KEY ("codeHash")
);

-- AddForeignKey
ALTER TABLE "McpPairingCode" ADD CONSTRAINT "McpPairingCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpPairingCode" ADD CONSTRAINT "McpPairingCode_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

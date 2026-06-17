-- AlterTable
ALTER TABLE "ConnectionEngineReachability" ADD COLUMN     "lastContact" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

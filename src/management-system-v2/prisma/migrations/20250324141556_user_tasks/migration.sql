-- CreateTable
CREATE TABLE "userTask" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "name" TEXT,
    "instanceID" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "html" TEXT,
    "priority" INTEGER NOT NULL,
    "progress" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "variableChanges" JSONB,
    "milestones" JSONB,
    "milestonesData" JSONB,
    "machineId" TEXT NOT NULL,

    CONSTRAINT "userTask_pkey" PRIMARY KEY ("id")
);

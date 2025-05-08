-- CreateTable
CREATE TABLE "userTask" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "name" TEXT,
    "instanceID" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "html" TEXT,
    "state" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "progress" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "initialVariables" JSONB,
    "variableChanges" JSONB,
    "milestones" JSONB,
    "milestonesChanges" JSONB,
    "machineId" TEXT NOT NULL,

    CONSTRAINT "userTask_pkey" PRIMARY KEY ("id")
);

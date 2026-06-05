// utility functions for calculating instance statistics from
export type ExtendedInstance = {
  executionStatus: 'Running' | 'Ended' | 'Failed';
  paused: boolean;
  pausing: boolean;
  globalStartTime?: number;
  state: {
    globalStartTime?: number;
    processInstanceId: string;
    instanceState: string[];
    [key: string]: any;
  };
  id: string;
  deploymentId: string;
  initiatorId: string | null;
  engineIds: string[];
  versionId: string;
  [key: string]: any;
}

interface InstanceStats {
  totalInstances: number;
  runningInstances: number;
  pausedInstances: number;
  completedInstances: number;
  failedInstances: number;
  stoppedInstances: number;
  deployments: number;
}

// filter instances by date range using globalStartTime
export function filterInstancesByDateRange(
  instances: ExtendedInstance[],
  startDate: Date | null,
  endDate: Date | null,
): ExtendedInstance[] {
  if (!startDate || !endDate) return instances;

  return instances.filter((instance) => {
    const startTime = instance.globalStartTime ?? instance.state?.globalStartTime;
    if (!startTime) return true;
    const instanceDate = new Date(startTime);
    return instanceDate >= startDate && instanceDate <= endDate;
  });
}

export function calculateInstanceStats(instances: ExtendedInstance[]): InstanceStats {
  let runningInstances = 0;
  let pausedInstances = 0;
  let completedInstances = 0;
  let failedInstances = 0;
  let stoppedInstances = 0;

  instances.forEach((instance) => {
    // use new executionStatus field from PR
    if (instance.paused) {
      pausedInstances++;
    } else if (instance.executionStatus === 'Running') {
      runningInstances++;
    } else if (instance.executionStatus === 'Ended') {
      completedInstances++;
    } else if (instance.executionStatus === 'Failed') {
      failedInstances++;
    } else {
      stoppedInstances++;
    }
  });

  return {
    totalInstances: instances.length,
    runningInstances,
    pausedInstances,
    completedInstances,
    failedInstances,
    stoppedInstances,
    deployments: 0,
  };
}

// get dummy data for placeholders
export function getDummyStats(): InstanceStats {
  return {
    deployments: 3,
    totalInstances: 14,
    runningInstances: 5,
    pausedInstances: 2,
    failedInstances: 0,
    completedInstances: 7,
    stoppedInstances: 0,
  };
}

// calculate user-specific stats (dummy for now; need real user task data)
export function calculateUserStats(baseStats: InstanceStats) {
  return {
    startedProcesses: baseStats.totalInstances,
    runningProcesses: baseStats.runningInstances,
    pausedProcesses: baseStats.pausedInstances,
    completedProcesses: baseStats.completedInstances,

    // dummy data; need real calculations
    accessibleProcesses: 12,
    executableProcesses: 10,
    onSchedule: Math.max(Math.floor(baseStats.runningInstances * 0.6), 0),
    exceededTime: Math.max(Math.floor(baseStats.runningInstances * 0.2), 0),
    closeToExceed: Math.max(Math.floor(baseStats.runningInstances * 0.2), 0),
    avgOpenTime: 4.5,
    avgCompletedTime: 2.3,
    longestRunning: 12.8,
    spentBudget: 12500,
    completedRegular: baseStats.completedInstances,
    completedWithError: baseStats.failedInstances,
    openTasks: 7,
    completedTasks: 15,
  };
}

// calculate manager-specific stats (dummy data)
export function calculateManagerStats() {
  return {
    accessibleProcesses: 45,
    executableProcesses: 38,
    startedProcesses: 128,
    runningProcesses: 42,
    pausedProcesses: 12,
    completedProcesses: 74,
    onSchedule: 30,
    exceededTime: 6,
    closeToExceed: 6,
    avgOpenTime: 5.2,
    avgCompletedTime: 3.1,
    longestRunning: 18.5,
    spentBudget: 45600,
    completedRegular: 68,
    completedWithError: 6,
  };
}
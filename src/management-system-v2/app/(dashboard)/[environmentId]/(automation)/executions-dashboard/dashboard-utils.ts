// utility functions for calculating instance statistics from deployed processes

interface DeployedProcess {
  definitionId: string;
  instances: any[];
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

const activeStates = ['PAUSED', 'RUNNING', 'READY', 'DEPLOYMENT-WAITING', 'WAITING'];
const failedStates = [
  'ABORTED',
  'FAILED',
  'ERROR-SEMANTIC',
  'ERROR-TECHNICAL',
  'ERROR-CONSTRAINT-UNFULFILLED',
  'ERROR-UNKNOWN',
];
const completedStates = ['ENDED', 'COMPLETED'];
const stoppedStates = ['STOPPED', 'TERMINATED'];

export function calculateInstanceStats(deployedProcesses: DeployedProcess[]): InstanceStats {
  let totalInstances = 0;
  let runningInstances = 0;
  let pausedInstances = 0;
  let completedInstances = 0;
  let failedInstances = 0;
  let stoppedInstances = 0;

  deployedProcesses.forEach((process) => {
    if (process.instances && Array.isArray(process.instances)) {
      process.instances.forEach((instance) => {
        totalInstances++;

        const instanceStates = instance.instanceState || [];

        if (instanceStates.includes('PAUSED')) {
          pausedInstances++;
        } else if (instanceStates.some((state: string) => stoppedStates.includes(state))) {
          stoppedInstances++;
        } else if (instanceStates.some((state: string) => activeStates.includes(state))) {
          runningInstances++;
        } else if (instanceStates.some((state: string) => failedStates.includes(state))) {
          failedInstances++;
        } else if (instanceStates.some((state: string) => completedStates.includes(state))) {
          completedInstances++;
        }
      });
    }
  });

  return {
    totalInstances,
    runningInstances,
    pausedInstances,
    completedInstances,
    failedInstances,
    stoppedInstances,
    deployments: deployedProcesses.length,
  };
}

// filter instances by date range
export function filterInstancesByDateRange(
  deployedProcesses: DeployedProcess[],
  startDate: Date | null,
  endDate: Date | null,
): DeployedProcess[] {
  if (!startDate || !endDate) return deployedProcesses;

  return deployedProcesses.map((process) => ({
    ...process,
    instances: process.instances.filter((instance) => {
      if (!instance.globalStartTime) return true;
      const instanceDate = new Date(instance.globalStartTime);
      return instanceDate >= startDate && instanceDate <= endDate;
    }),
  }));
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
    // real data from instances
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

import type { ExtendedInstance } from '@/lib/data/instance';

// helpers

function msToHours(ms?: number): number {
  if (!ms) return 0;
  return Math.round((ms / 3600000) * 10) / 10;
}

function sumCosts(costs: { value: number; unit: string }[]): number {
  return costs.reduce((sum, c) => sum + c.value, 0);
}

function groupByMonth(
  instances: ExtendedInstance[],
): { month: string; completed: number; failed: number }[] {
  const months: Record<string, { completed: number; failed: number }> = {};
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  instances.forEach((instance) => {
    const startTime = instance.state.globalStartTime;
    if (!startTime) return;
    const date = new Date(startTime);
    const label = monthNames[date.getMonth()];
    if (!months[label]) months[label] = { completed: 0, failed: 0 };
    if (instance.executionStatus === 'Ended') months[label].completed++;
    if (instance.executionStatus === 'Failed') months[label].failed++;
  });

  return Object.entries(months).map(([month, vals]) => ({ month, ...vals }));
}

function groupByDay(
  instances: ExtendedInstance[],
): { day: string; started: number; completed: number }[] {
  const days: Record<string, { started: number; completed: number }> = {};

  instances.forEach((instance) => {
    const startTime = instance.state.globalStartTime;
    if (!startTime) return;
    const date = new Date(startTime);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const label = dayNames[date.getDay()];
    if (!days[label]) days[label] = { started: 0, completed: 0 };
    days[label].started++;
    if (instance.executionStatus === 'Ended') days[label].completed++;
  });

  const orderedDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return orderedDays.map((day) => ({
    day,
    started: days[day]?.started || 0,
    completed: days[day]?.completed || 0,
  }));
}

// types
export interface InstanceStats {
  totalInstances: number;
  runningInstances: number;
  pausedInstances: number;
  completedInstances: number;
  failedInstances: number;
  stoppedInstances: number;
  deployments: number;
  avgOpenTimeMs: number;
  avgCompletedTimeMs: number;
  longestRunningMs: number;
  onSchedule: number;
  exceededTime: number;
  closeToExceed: number;
  onScheduleRunning: number;
  closeToExceedRunning: number;
  exceededTimeRunning: number;
  spentBudget: number;
  plannedBudget: number;
  monthlyData: { month: string; completed: number; failed: number }[];
  weeklyData: { day: string; started: number; completed: number }[];
}

// Date Filter
export function filterInstancesByDateRange(
  instances: ExtendedInstance[],
  startDate: Date | null,
  endDate: Date | null,
): ExtendedInstance[] {
  if (!startDate || !endDate) return instances;

  return instances.filter((instance) => {
    const startTime = instance.state.globalStartTime;
    if (!startTime) return true;
    const instanceDate = new Date(startTime);
    return instanceDate >= startDate && instanceDate <= endDate;
  });
}

// Core Stats Calculator
export function calculateInstanceStats(instances: ExtendedInstance[]): InstanceStats {
  let runningInstances = 0;
  let pausedInstances = 0;
  let completedInstances = 0;
  let failedInstances = 0;
  let stoppedInstances = 0;
  let totalOpenTimeMs = 0;
  let openTimeCount = 0;
  let totalCompletedTimeMs = 0;
  let completedTimeCount = 0;
  let longestRunningMs = 0;
  // all instances (for count display)
  let onSchedule = 0;
  let exceededTime = 0;
  let closeToExceed = 0;
  // running or paused instances only (for percentage/bar calculation)
  let onScheduleRunning = 0;
  let closeToExceedRunning = 0;
  let exceededTimeRunning = 0;
  let spentBudget = 0;
  let plannedBudget = 0;

  instances.forEach((instance) => {
    // Status
    const isStoppedManually = instance.state.instanceState?.some((s) => s === 'STOPPED');
    if (instance.paused) {
      pausedInstances++;
    } else if (instance.executionStatus === 'Running') {
      runningInstances++;
    } else if (instance.executionStatus === 'Failed') {
      failedInstances++;
    } else if (isStoppedManually) {
      stoppedInstances++;
    } else if (instance.executionStatus === 'Ended') {
      completedInstances++;
    }

    // Timing
    const timing = instance.state.timing;
    if (timing) {
      const actualDuration = timing.actual.duration;
      const plannedDuration = timing.plan.duration;

      if (actualDuration !== undefined) {
        if (instance.executionStatus === 'Running' || instance.paused) {
          totalOpenTimeMs += actualDuration;
          openTimeCount++;
          if (actualDuration > longestRunningMs) longestRunningMs = actualDuration;
        } else if (instance.executionStatus === 'Ended') {
          totalCompletedTimeMs += actualDuration;
          completedTimeCount++;
        }

        const isRunning = instance.executionStatus === 'Running' || instance.paused;

        if (!!plannedDuration) {
          const ratio = actualDuration / plannedDuration;

          // count for all instances
          if (ratio >= 1.0) exceededTime++;
          else if (ratio >= 0.9) closeToExceed++;
          else onSchedule++;

          // count for running or paused instances only (for % bar)
          if (isRunning) {
            if (ratio >= 1.0) exceededTimeRunning++;
            else if (ratio >= 0.9) closeToExceedRunning++;
            else onScheduleRunning++;
          }
        } else {
          // no planned duration is treated as on schedule
          onSchedule++;
          if (isRunning) onScheduleRunning++;
        }
      }
    }

    // Budget
    if (instance.state.executionCosts?.length) {
      spentBudget += sumCosts(instance.state.executionCosts);
    }
    if (instance.state.plannedCosts?.length) {
      plannedBudget += sumCosts(instance.state.plannedCosts);
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
    avgOpenTimeMs: openTimeCount > 0 ? totalOpenTimeMs / openTimeCount : 0,
    avgCompletedTimeMs: completedTimeCount > 0 ? totalCompletedTimeMs / completedTimeCount : 0,
    longestRunningMs,
    onSchedule,
    exceededTime,
    closeToExceed,
    onScheduleRunning,
    closeToExceedRunning,
    exceededTimeRunning,
    spentBudget: Math.round(spentBudget),
    plannedBudget: Math.round(plannedBudget),
    monthlyData: groupByMonth(instances),
    weeklyData: groupByDay(instances),
  };
}

// Empty Stats
export function getEmptyStats(): InstanceStats {
  return calculateInstanceStats([]);
}

// User Stats
export function calculateUserStats(
  baseStats: InstanceStats,
  accessibleProcesses: number = 0,
  executableProcesses: number = 0,
  yourOpenTasks: number = 0,
  yourCompletedTasks: number = 0,
  groupOpenTasks: number = 0,
  groupCompletedTasks: number = 0,
  unassignedTasks: number = 0,
  isAdmin: boolean = false,
  isOrganization: boolean = false,
) {
  return {
    startedProcesses: baseStats.totalInstances,
    runningProcesses: baseStats.runningInstances,
    pausedProcesses: baseStats.pausedInstances,
    completedProcesses: baseStats.completedInstances,
    onSchedule: baseStats.onSchedule,
    exceededTime: baseStats.exceededTime,
    closeToExceed: baseStats.closeToExceed,
    onScheduleRunning: baseStats.onScheduleRunning,
    closeToExceedRunning: baseStats.closeToExceedRunning,
    exceededTimeRunning: baseStats.exceededTimeRunning,
    spentBudget: baseStats.spentBudget,
    plannedBudget: baseStats.plannedBudget,
    avgOpenTime: msToHours(baseStats.avgOpenTimeMs),
    avgCompletedTime: msToHours(baseStats.avgCompletedTimeMs),
    longestRunning: msToHours(baseStats.longestRunningMs),
    completedRegular: baseStats.completedInstances,
    completedWithError: baseStats.failedInstances,
    weeklyData: baseStats.weeklyData,
    accessibleProcesses,
    executableProcesses,
    yourOpenTasks,
    yourCompletedTasks,
    groupOpenTasks,
    groupCompletedTasks,
    unassignedTasks,
    isAdmin,
    isOrganization,
  };
}

// Manager Stats
export function calculateManagerStats(
  baseStats?: InstanceStats,
  accessibleProcesses: number = 0,
  executableProcesses: number = 0,
  teamMemberCount: number = 0,
) {
  return {
    startedProcesses: baseStats?.totalInstances ?? 0,
    runningProcesses: baseStats?.runningInstances ?? 0,
    pausedProcesses: baseStats?.pausedInstances ?? 0,
    completedProcesses: baseStats?.completedInstances ?? 0,
    onSchedule: baseStats?.onSchedule ?? 0,
    exceededTime: baseStats?.exceededTime ?? 0,
    closeToExceed: baseStats?.closeToExceed ?? 0,
    onScheduleRunning: baseStats?.onScheduleRunning ?? 0,
    closeToExceedRunning: baseStats?.closeToExceedRunning ?? 0,
    exceededTimeRunning: baseStats?.exceededTimeRunning ?? 0,
    avgOpenTime: msToHours(baseStats?.avgOpenTimeMs) || 0,
    avgCompletedTime: msToHours(baseStats?.avgCompletedTimeMs) || 0,
    longestRunning: msToHours(baseStats?.longestRunningMs) || 0,
    spentBudget: baseStats?.spentBudget ?? 0,
    plannedBudget: baseStats?.plannedBudget ?? 0,
    monthlyData: baseStats?.monthlyData ?? [],
    completedRegular: baseStats?.completedInstances ?? 0,
    completedWithError: baseStats?.failedInstances ?? 0,
    accessibleProcesses,
    executableProcesses,
    teamMemberCount,
  };
}
